import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';
import { contactSchema } from '../../lib/schema';
import { messagesStore } from '../../lib/store';
import { ipKey, json, rateLimit, sameOrigin, verifyTurnstile } from '../../lib/security';

export const prerender = false;

/** Formulaire de contact : Turnstile + pot de miel + limite de débit + validation stricte. */
export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  if (!sameOrigin(request, url)) return json({ error: 'Origine refusée' }, 403);
  const rl = await rateLimit('contact', ipKey(clientAddress), 3, 60 * 60_000);
  if (!rl.ok) return json({ error: 'Trop de messages envoyés. Réessayez plus tard.' }, 429);

  if (Number(request.headers.get('content-length') ?? '0') > 16 * 1024) return json({ error: 'Message trop long' }, 413);
  let data: Record<string, unknown>;
  try {
    data = Object.fromEntries((await request.formData()).entries());
  } catch {
    return json({ error: 'Formulaire invalide' }, 400);
  }
  const parsed = contactSchema.safeParse(data);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Formulaire invalide' }, 400);
  if (parsed.data.website) return json({ ok: true }); // robot : on fait semblant

  if (!(await verifyTurnstile(parsed.data['cf-turnstile-response'], clientAddress))) {
    return json({ error: 'Vérification anti-robot échouée, réessayez.' }, 400);
  }

  const id = `${new Date().toISOString().replace(/[:.]/g, '-').toLowerCase()}-${randomBytes(4).toString('hex')}`;
  await messagesStore().setJSON(id, {
    name: parsed.data.name,
    email: parsed.data.email,
    message: parsed.data.message,
    at: new Date().toISOString(),
  });
  return json({ ok: true });
};
