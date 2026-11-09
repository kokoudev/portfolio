import { createHash } from 'node:crypto';
import { securityStore } from './store';

/** Identifiant d'IP pseudonymisé (on ne stocke jamais l'IP en clair). */
export function ipKey(ip: string | undefined): string {
  return createHash('sha256').update(`pf-salt:${ip ?? 'unknown'}`).digest('hex').slice(0, 32);
}

interface Bucket {
  count: number;
  resetAt: number;
  lockedUntil?: number;
}

/**
 * Limiteur de débit simple à fenêtre fixe, stocké dans Netlify Blobs.
 * Retourne true si la requête est autorisée.
 */
export async function rateLimit(scope: string, key: string, max: number, windowMs: number, lockMs = 0): Promise<{ ok: boolean; retryAfter: number }> {
  const store = securityStore();
  const k = `rl/${scope}/${key}`;
  const now = Date.now();
  let b = ((await store.get(k, { type: 'json' })) as Bucket | null) ?? { count: 0, resetAt: now + windowMs };
  if (b.lockedUntil && b.lockedUntil > now) return { ok: false, retryAfter: Math.ceil((b.lockedUntil - now) / 1000) };
  if (b.resetAt <= now) b = { count: 0, resetAt: now + windowMs };
  b.count += 1;
  if (b.count > max) {
    if (lockMs) b.lockedUntil = now + lockMs;
    await store.setJSON(k, b);
    return { ok: false, retryAfter: Math.ceil(((b.lockedUntil ?? b.resetAt) - now) / 1000) };
  }
  await store.setJSON(k, b);
  return { ok: true, retryAfter: 0 };
}

export async function resetRateLimit(scope: string, key: string) {
  await securityStore().delete(`rl/${scope}/${key}`);
}

/** Vérifie que la requête provient bien de notre propre origine (anti-CSRF). */
export function sameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get('origin');
  if (origin) return origin === url.origin;
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin === url.origin;
    } catch {
      return false;
    }
  }
  return false;
}

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extra,
    },
  });
}

/* ---------------- Turnstile ---------------- */

const TEST_SECRET = '1x0000000000000000000000000000000AA';

export async function verifyTurnstile(token: string, ip: string | undefined): Promise<boolean> {
  let secret = process.env.TURNSTILE_SECRET_KEY ?? import.meta.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (import.meta.env.DEV) secret = TEST_SECRET; // clé de test officielle, uniquement en local
    else return false; // en production : on refuse si non configuré (fail closed)
  }
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

/* ---------------- Contrôle des fichiers envoyés ---------------- */

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Détecte le vrai type d'un fichier par ses premiers octets (on n'a jamais confiance dans le type annoncé). */
export function sniffType(buf: Uint8Array): { mime: string; ext: string } | null {
  const b = buf;
  const startsWith = (sig: number[], off = 0) => sig.every((v, i) => b[off + i] === v);
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: 'image/png', ext: 'png' };
  if (startsWith([0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg' };
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return { mime: 'image/webp', ext: 'webp' };
  if (startsWith([0x66, 0x74, 0x79, 0x70], 4) && (startsWith([0x61, 0x76, 0x69, 0x66], 8) || startsWith([0x61, 0x76, 0x69, 0x73], 8)))
    return { mime: 'image/avif', ext: 'avif' };
  if (startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])) return { mime: 'application/pdf', ext: 'pdf' };
  return null;
}
