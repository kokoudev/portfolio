import type { APIRoute } from 'astro';
import { messagesStore } from '../../../lib/store';
import { json } from '../../../lib/security';

export const prerender = false;

const RETENTION_DAYS = 90;

export const GET: APIRoute = async () => {
  const store = messagesStore();
  // Les clés commencent par la date ISO : tri chronologique direct, sans lire les messages.
  const all: string[] = [];
  for await (const page of store.list({ paginate: true })) {
    for (const b of page.blobs) all.push(b.key);
    if (all.length > 5000) break;
  }
  all.sort().reverse();
  // Minimisation : purge des messages plus anciens que la durée de conservation
  const limit = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
  const old = new Set(all.filter((k) => k.slice(0, 10) < limit).slice(0, 50));
  await Promise.all([...old].map((k) => store.delete(k)));
  const keys = all.filter((k) => !old.has(k)).slice(0, 100);
  const items = await Promise.all(keys.map(async (k) => ({ id: k, ...((await store.get(k, { type: 'json' })) as object) })));
  return json(items);
};

export const DELETE: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id') ?? '';
  if (!/^[0-9a-z-]{8,80}$/.test(id)) return json({ error: 'Identifiant invalide' }, 400);
  await messagesStore().delete(id);
  return json({ ok: true });
};
