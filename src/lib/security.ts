import { createHmac } from 'node:crypto';
import { getSecret } from 'astro:env/server';
import { securityStore } from './store';

/* ---------------- Identifiant d'IP pseudonymisé ---------------- */

/** Regroupe les IPv6 par /64 (un attaquant en possède 2^64 par bloc). */
export function normalizeIp(ip: string | undefined): string {
  if (!ip) return 'unknown';
  if (ip.includes(':') && !ip.startsWith('::ffff:')) return ip.split(':').slice(0, 4).join(':') + '::/64';
  return ip.replace(/^::ffff:/, '');
}

/** HMAC secret de l'IP : jamais stockée en clair, non réversible sans le secret. */
export function ipKey(ip: string | undefined): string {
  const key = getSecret('IP_HASH_SECRET') || getSecret('PASETO_LOCAL_KEY') || 'dev-only';
  return createHmac('sha256', key).update(normalizeIp(ip)).digest('hex').slice(0, 32);
}

/* ---------------- Limiteur de débit (écritures conditionnelles = sans course) ---------------- */

interface Bucket {
  count: number;
  resetAt: number;
  lockedUntil?: number;
}

/**
 * Fenêtre fixe stockée dans Netlify Blobs. Les écritures sont conditionnelles (ETag) :
 * des requêtes parallèles ne peuvent pas lire le même compteur et passer toutes.
 */
export async function rateLimit(scope: string, key: string, max: number, windowMs: number, lockMs = 0): Promise<{ ok: boolean; retryAfter: number }> {
  const store = securityStore();
  const k = `rl/${scope}/${key}`;
  const MAX_TRIES = 4;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const now = Date.now();
    const cur = await store.getWithMetadata(k, { type: 'json' });
    let b = (cur?.data as Bucket | undefined) ?? { count: 0, resetAt: now + windowMs };
    if (b.lockedUntil && b.lockedUntil > now) return { ok: false, retryAfter: Math.ceil((b.lockedUntil - now) / 1000) };
    if (b.resetAt <= now) b = { count: 0, resetAt: now + windowMs };
    b.count += 1;
    const blocked = b.count > max;
    if (blocked && lockMs) b.lockedUntil = now + lockMs;
    const last = attempt === MAX_TRIES - 1;
    // Écriture conditionnelle ; au dernier essai, écriture simple (l'émulateur local gère mal les ETag)
    const res = last
      ? await store.setJSON(k, b)
      : cur?.etag
        ? await store.setJSON(k, b, { onlyIfMatch: cur.etag })
        : await store.setJSON(k, b, { onlyIfNew: true });
    if (!last && res.modified === false) continue; // quelqu'un a écrit entre-temps : on relit
    return blocked ? { ok: false, retryAfter: Math.ceil(((b.lockedUntil ?? b.resetAt) - now) / 1000) } : { ok: true, retryAfter: 0 };
  }
  return { ok: false, retryAfter: 2 };
}

/** Lecture seule : la limite est-elle déjà atteinte ? (n'incrémente rien) */
export async function isLimited(scope: string, key: string, max: number): Promise<{ limited: boolean; retryAfter: number }> {
  const b = (await securityStore().get(`rl/${scope}/${key}`, { type: 'json' })) as Bucket | null;
  const now = Date.now();
  if (!b) return { limited: false, retryAfter: 0 };
  if (b.lockedUntil && b.lockedUntil > now) return { limited: true, retryAfter: Math.ceil((b.lockedUntil - now) / 1000) };
  if (b.resetAt > now && b.count >= max) return { limited: true, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  return { limited: false, retryAfter: 0 };
}

export async function resetRateLimit(scope: string, key: string) {
  await securityStore().delete(`rl/${scope}/${key}`);
}

/**
 * Lit le corps de la requête en comptant les octets réellement reçus : on s'arrête dès que `max`
 * est dépassé, même si l'en-tête Content-Length ment. Renvoie null si trop volumineux.
 */
export async function readBody(request: Request, max: number): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

/** Corps borné → texte (JSON). */
export async function readText(request: Request, max: number): Promise<string | null> {
  const b = await readBody(request, max);
  return b === null ? null : new TextDecoder().decode(b);
}

/** Corps borné → FormData (null si trop volumineux, 'invalid' si illisible). */
export async function readForm(request: Request, max: number): Promise<FormData | null | 'invalid'> {
  const b = await readBody(request, max);
  if (b === null) return null;
  try {
    return await new Response(b, { headers: { 'content-type': request.headers.get('content-type') ?? '' } }).formData();
  } catch {
    return 'invalid';
  }
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

/**
 * Vérifie un jeton Turnstile côté serveur : succès + action attendue + nom d'hôte attendu.
 * Un jeton obtenu sur le formulaire de contact ne peut donc pas servir à la connexion admin.
 */
export async function verifyTurnstile(token: string, ip: string | undefined, action: 'login' | 'contact', host: string): Promise<boolean> {
  let secretKey = getSecret('TURNSTILE_SECRET_KEY');
  const isTest = !secretKey && import.meta.env.DEV;
  if (!secretKey) {
    if (isTest) secretKey = TEST_SECRET; // clé de test officielle, uniquement en local
    else return false; // en production : refus si non configuré (fail closed)
  }
  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean; action?: string; hostname?: string };
    if (data.success !== true) return false;
    if (isTest) return true; // les clés de test ne renvoient ni action ni hôte réels
    return data.action === action && data.hostname === host;
  } catch {
    return false;
  }
}

/* ---------------- Contrôle des fichiers envoyés ---------------- */

/** Netlify Functions limite le corps des requêtes à ~6 Mo : on reste en dessous. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

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
