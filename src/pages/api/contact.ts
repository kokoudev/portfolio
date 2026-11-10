import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';
import { contactSchema } from '../../lib/schema';
import { messagesStore } from '../../lib/store';
import { ipKey, isLimited, json, rateLimit, readForm, sameOrigin, verifyTurnstile } from '../../lib/security';

export const prerender = false;

/** Formulaire de contact : Turnstile + pot de miel + limite de débit + validation stricte. */
export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  if (!sameOrigin(request, url)) return json({ error: 'Origine refusée' }, 403);
  const ip = ipKey(clientAddress);
  // Lecture seule ici : on ne compte qu'un message réellement accepté (après Turnstile),
  // pour qu'un visiteur qui se trompe dans le formulaire ne soit pas bloqué.
  if ((await isLimited('contact', ip, 3)).limited || (await isLimited('contact-global', 'all', 50)).limited) {
    return json({ error: 'Trop de messages envoyés. Réessayez plus tard.' }, 429);
  }

  const len = request.headers.get('content-length');
  if (!len) return json({ error: 'Longueur requise' }, 411);
  if (Number(len) > 16 * 1024) return json({ error: 'Message trop long' }, 413);
  const form = await readForm(request, 16 * 1024);
  if (form === null) return json({ error: 'Message trop long' }, 413);
  if (form === 'invalid') return json({ error: 'Formulaire invalide' }, 400);
  const data: Record<string, unknown> = Object.fromEntries(form.entries());
  const parsed = contactSchema.safeParse(data);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' }, 400);
  if (parsed.data.website) return json({ ok: true }); // robot : on fait semblant

  if (!(await verifyTurnstile(parsed.data['cf-turnstile-response'], clientAddress, 'contact', url.hostname))) {
    return json({ error: 'Vérification anti-robot échouée, réessayez.' }, 400);
  }

  // Comptage atomique (ETag) : 3 messages / heure / IP, 50 messages / jour au total
  const rl = await rateLimit('contact', ip, 3, 60 * 60_000);
  const rg = await rateLimit('contact-global', 'all', 50, 24 * 60 * 60_000);
  if (!rl.ok || !rg.ok) return json({ error: 'Trop de messages envoyés. Réessayez plus tard.' }, 429);

  const id = `${new Date().toISOString().replace(/[:.]/g, '-').toLowerCase()}-${randomBytes(4).toString('hex')}`;
  await messagesStore().setJSON(id, {
    name: parsed.data.name,
    email: parsed.data.email,
    message: parsed.data.message,
    at: new Date().toISOString(),
  });
  return json({ ok: true });
};
