import type { APIRoute } from 'astro';
import { z } from 'zod';
import { adminPasswordHash, adminUsername, createSession, safeEqual, verifyPassword } from '../../../lib/auth';
import { ipKey, json, rateLimit, resetRateLimit, verifyTurnstile } from '../../../lib/security';

export const prerender = false;

const body = z.object({
  username: z.string().max(80),
  password: z.string().min(1).max(256),
  turnstile: z.string().min(1).max(4096),
});

// Hash factice pour garder un temps de réponse constant quand le nom est faux
const DUMMY_HASH = 'scrypt:131072:8:1:AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const ip = ipKey(clientAddress);
  // 5 essais / 15 min par IP, puis blocage 30 min ; plafond global contre les attaques distribuées
  const perIp = await rateLimit('login-ip', ip, 5, 15 * 60_000, 30 * 60_000);
  if (!perIp.ok) return json({ error: 'Trop de tentatives. Réessayez plus tard.' }, 429, { 'Retry-After': String(perIp.retryAfter) });
  const global = await rateLimit('login-global', 'all', 60, 60 * 60_000);
  if (!global.ok) return json({ error: 'Connexion temporairement suspendue.' }, 429, { 'Retry-After': String(global.retryAfter) });

  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'Format invalide' }, 415);
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Identifiants invalides' }, 400);

  if (!(await verifyTurnstile(parsed.data.turnstile, clientAddress))) {
    return json({ error: 'Vérification anti-robot échouée' }, 400);
  }

  let expectedUser: string, hash: string;
  try {
    expectedUser = adminUsername();
    hash = adminPasswordHash();
  } catch {
    console.error('[login] admin non configuré');
    return json({ error: 'Administration non configurée' }, 503);
  }

  const userOk = safeEqual(parsed.data.username, expectedUser);
  const pwOk = await verifyPassword(parsed.data.password, userOk ? hash : DUMMY_HASH);
  if (!userOk || !pwOk) {
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));
    return json({ error: 'Identifiants invalides' }, 401);
  }

  await resetRateLimit('login-ip', ip);
  const session = await createSession(cookies, expectedUser);
  return json({ ok: true, csrf: session.csrf, exp: session.exp });
};

export const ALL: APIRoute = () => json({ error: 'Méthode non autorisée' }, 405, { Allow: 'POST' });
