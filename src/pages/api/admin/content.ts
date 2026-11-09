import type { APIRoute } from 'astro';
import { purgeCache } from '@netlify/cache';
import { contentSchema } from '../../../lib/schema';
import { readContent, writeContent } from '../../../lib/store';
import { json } from '../../../lib/security';

export const prerender = false;
const MAX_BODY = 512 * 1024;

export const GET: APIRoute = async () => json(await readContent());

/** Remplace tout le contenu (ajout, modification, suppression, réordonnancement). Validé strictement. */
export const PUT: APIRoute = async ({ request }) => {
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'Format invalide' }, 415);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'Contenu trop volumineux' }, 413);
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return json({ error: 'JSON invalide' }, 400);
  }
  const parsed = contentSchema.safeParse(data);
  if (!parsed.success) {
    return json({ error: 'Données invalides', issues: parsed.error.issues.slice(0, 10).map((i) => ({ path: i.path.join('.'), message: i.message })) }, 422);
  }
  const ids = (arr: { id: string }[]) => new Set(arr.map((x) => x.id)).size === arr.length;
  const c = parsed.data;
  if (!ids(c.projects) || !ids(c.formations) || !ids(c.certifications) || !ids(c.diplomas)) {
    return json({ error: 'Identifiants en double' }, 422);
  }
  const saved = await writeContent(c);
  try {
    await purgeCache({ tags: ['content'] });
  } catch {
    /* hors Netlify (dev) : rien à purger */
  }
  return json(saved);
};
