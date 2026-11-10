import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createSession, purgeExpiredRevocations, safeEqual, secret, verifyPassword } from '../../../lib/auth';
import { ipKey, isLimited, json, rateLimit, readText, resetRateLimit, verifyTurnstile } from '../../../lib/security';

export const prerender = false;

const body = z.object({
  username: z.string().max(80),
  password: z.string().min(1).max(256),
  turnstile: z.string().min(1).max(4096),
});

// Hash factice aux mêmes paramètres : temps de réponse identique quand le nom est faux
const DUMMY_HASH = 'scrypt:131072:8:1:AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const MAX_FAILS = 5;

/**
 * Ordre volontaire :
 * 1. l'IP (regroupée /64 en IPv6) est-elle déjà bloquée ?  → 429
 * 2. Turnstile (action « login » + nom d'hôte)            → 400
 * 3. la tentative est comptée de façon atomique AVANT scrypt (des requêtes parallèles ne passent pas
 *    toutes), puis le compteur est remis à zéro si la connexion réussit : seuls les échecs restent
 *    comptés. 5 échecs / 15 min → blocage 30 min pour cette IP.
 * 4. mot de passe scrypt en temps constant
 * Aucun verrou global : un attaquant ne peut pas empêcher le propriétaire de se connecter.
 */
export const POST: APIRoute = async ({ request, cookies, clientAddress, url }) => {
  const ip = ipKey(clientAddress);
  const limited = await isLimited('login-fail', ip, MAX_FAILS);
  if (limited.limited) return json({ error: 'Trop de tentatives. Réessayez plus tard.' }, 429, { 'Retry-After': String(limited.retryAfter) });

  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'Format invalide' }, 415);
  const raw = await readText(request, 8192);
  if (raw === null) return json({ error: 'Requête trop volumineuse' }, 413);
  let data: unknown = null;
  try { data = JSON.parse(raw); } catch { /* invalide */ }
  const parsed = body.safeParse(data);
  if (!parsed.success) return json({ error: 'Identifiants invalides' }, 400);

  if (!(await verifyTurnstile(parsed.data.turnstile, clientAddress, 'login', url.hostname))) {
    return json({ error: 'Vérification anti-robot échouée' }, 400);
  }

  let expectedUser: string, hash: string;
  try {
    expectedUser = secret('ADMIN_USERNAME');
    hash = secret('ADMIN_PASSWORD_HASH');
    secret('PASETO_LOCAL_KEY');
  } catch {
    console.error('[login] administration non configurée');
    return json({ error: 'Administration non configurée' }, 503);
  }

  const r = await rateLimit('login-fail', ip, MAX_FAILS, 15 * 60_000, 30 * 60_000);
  if (!r.ok) return json({ error: 'Trop de tentatives. Réessayez plus tard.' }, 429, { 'Retry-After': String(r.retryAfter) });

  const userOk = safeEqual(parsed.data.username, expectedUser);
  const pwOk = await verifyPassword(parsed.data.password, userOk ? hash : DUMMY_HASH);
  if (!userOk || !pwOk) {
    const g = await rateLimit('login-fail-global', 'all', 100, 60 * 60_000);
    if (!g.ok) console.warn('[login] plus de 100 échecs de connexion en une heure : attaque probable');
    await new Promise((res) => setTimeout(res, 300 + Math.random() * 400));
    return json({ error: 'Identifiants invalides' }, 401);
  }

  await resetRateLimit('login-fail', ip);
  purgeExpiredRevocations().catch(() => {});
  const session = await createSession(cookies, expectedUser);
  return json({ ok: true, csrf: session.csrf, exp: session.exp });
};

export const ALL: APIRoute = () => json({ error: 'Méthode non autorisée' }, 405, { Allow: 'POST' });
