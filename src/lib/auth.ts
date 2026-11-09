import { scrypt as scryptCb, timingSafeEqual, randomBytes, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { encrypt, decrypt } from 'paseto-ts/v4';
import type { AstroCookies } from 'astro';
import { securityStore } from './store';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

export const SESSION_COOKIE = '__Host-pf_session';
const SESSION_TTL_S = 2 * 60 * 60; // 2 h
const IMPLICIT_ASSERTION = 'portfolio-admin:v1'; // lie le jeton à cette application

function env(name: string): string {
  const v = process.env[name] ?? (import.meta.env as Record<string, string | undefined>)[name];
  if (!v) throw new Error(`Variable d’environnement manquante : ${name}`);
  return v;
}

/* ---------------- Mot de passe (scrypt) ---------------- */

/** Format : scrypt:N:r:p:selBase64:hashBase64 (« : » et non « $ », que les fichiers .env interprètent) */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nS, rS, pS, saltB64, hashB64] = parts;
  const N = Number(nS), r = Number(rS), p = Number(pS);
  if (!Number.isInteger(N) || N < 2 ** 14 || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, {
    N, r, p, maxmem: 256 * N * r,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Compare deux chaînes en temps constant (après hachage pour égaliser les longueurs). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

/* ---------------- Sessions PASETO v4.local ---------------- */

export interface Session {
  sub: string;
  jti: string;
  csrf: string;
  exp: string;
}

export async function createSession(cookies: AstroCookies, username: string): Promise<Session> {
  const now = Date.now();
  const payload = {
    sub: username,
    jti: randomBytes(16).toString('base64url'),
    csrf: randomBytes(24).toString('base64url'),
    iat: new Date(now).toISOString(),
    nbf: new Date(now).toISOString(),
    exp: new Date(now + SESSION_TTL_S * 1000).toISOString(),
    aud: 'portfolio-admin',
    iss: 'portfolio',
  };
  const token = await encrypt(env('PASETO_LOCAL_KEY'), payload, {
    assertion: IMPLICIT_ASSERTION,
    addExp: false,
    addIat: false,
    footer: { kid: 'pf-admin-1' },
  });
  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_S,
  });
  return payload;
}

/** Vérifie le cookie de session : chiffrement authentifié, expiration, audience, révocation. */
export async function readSession(cookies: AstroCookies): Promise<Session | null> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 2048 || !token.startsWith('v4.local.')) return null;
  try {
    const { payload } = await decrypt<{ sub: string; jti: string; csrf: string; exp: string; aud: string; iss: string }>(
      env('PASETO_LOCAL_KEY'),
      token,
      { assertion: IMPLICIT_ASSERTION, maxDepth: 4, maxKeys: 16 },
    );
    if (payload.aud !== 'portfolio-admin' || payload.iss !== 'portfolio') return null;
    if (!payload.exp || Date.parse(payload.exp) <= Date.now()) return null;
    if (payload.sub !== env('ADMIN_USERNAME')) return null;
    const revoked = await securityStore().get(`revoked/${payload.jti}`);
    if (revoked) return null;
    return { sub: payload.sub, jti: payload.jti, csrf: payload.csrf, exp: payload.exp };
  } catch {
    return null;
  }
}

export async function destroySession(cookies: AstroCookies, session: Session | null) {
  if (session) {
    await securityStore().set(`revoked/${session.jti}`, session.exp);
  }
  cookies.delete(SESSION_COOKIE, { path: '/', secure: true, httpOnly: true, sameSite: 'strict' });
}

export function adminUsername() {
  return env('ADMIN_USERNAME');
}
export function adminPasswordHash() {
  return env('ADMIN_PASSWORD_HASH');
}
