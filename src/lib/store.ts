import { getStore } from '@netlify/blobs';
import { contentSchema, type Content } from './schema';
import { seed } from '../data/seed';

const CONTENT_KEY = 'site-v1';

function contentStore() {
  return getStore({ name: 'content', consistency: 'strong' });
}
export function mediaStore() {
  return getStore({ name: 'media', consistency: 'strong' });
}
export function securityStore() {
  return getStore({ name: 'security', consistency: 'strong' });
}
export function messagesStore() {
  return getStore({ name: 'messages', consistency: 'strong' });
}
export function cacheStore() {
  return getStore({ name: 'cache' });
}

/** Lit le contenu ; retombe sur le contenu initial si rien n'est enregistré ou si Blobs est indisponible. */
export async function readContent(): Promise<Content> {
  try {
    const raw = await contentStore().get(CONTENT_KEY, { type: 'json' });
    if (!raw) return structuredClone(seed);
    const parsed = contentSchema.safeParse(raw);
    return parsed.success ? parsed.data : structuredClone(seed);
  } catch (err) {
    console.error('[store] lecture impossible, contenu initial utilisé', err instanceof Error ? err.message : err);
    return structuredClone(seed);
  }
}

export async function writeContent(content: Content): Promise<Content> {
  const valid = contentSchema.parse(content);
  await contentStore().setJSON(CONTENT_KEY, valid);
  return valid;
}
