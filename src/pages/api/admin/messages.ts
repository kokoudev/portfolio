import type { APIRoute } from 'astro';
import { messagesStore } from '../../../lib/store';
import { json } from '../../../lib/security';

export const prerender = false;

export const GET: APIRoute = async () => {
  const store = messagesStore();
  const { blobs } = await store.list();
  const keys = blobs.map((b) => b.key).sort().reverse().slice(0, 100);
  const items = await Promise.all(keys.map(async (k) => ({ id: k, ...((await store.get(k, { type: 'json' })) as object) })));
  return json(items);
};

export const DELETE: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id') ?? '';
  if (!/^[0-9a-z-]{8,80}$/.test(id)) return json({ error: 'Identifiant invalide' }, 400);
  await messagesStore().delete(id);
  return json({ ok: true });
};
