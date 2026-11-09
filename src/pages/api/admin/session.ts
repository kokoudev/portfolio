import type { APIRoute } from 'astro';
import { destroySession } from '../../../lib/auth';
import { json } from '../../../lib/security';

export const prerender = false;

/** Renvoie le jeton CSRF de la session courante (la session est vérifiée par le middleware). */
export const GET: APIRoute = ({ locals }) => {
  const s = locals.session!;
  return json({ user: s.sub, csrf: s.csrf, exp: s.exp });
};

/** Déconnexion : révoque le jeton côté serveur et supprime le cookie. */
export const DELETE: APIRoute = async ({ locals, cookies }) => {
  await destroySession(cookies, locals.session ?? null);
  return json({ ok: true });
};
