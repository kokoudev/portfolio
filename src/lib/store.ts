import { getStore } from '@netlify/blobs';
import { contentSchema, type Content } from './schema';
import { seed } from '../data/seed';
import { migrate } from './migrations';

const CONTENT_KEY = 'site-v1';

/**
 * Les Deploy Previews et branch deploys ne touchent JAMAIS aux données de production :
 * leurs stores sont préfixés « preview- ».
 */
function name(base: string) {
  const ctx = process.env.CONTEXT; // fourni par Netlify : production | deploy-preview | branch-deploy | dev
  return ctx && ctx !== 'production' && ctx !== 'dev' ? `preview-${base}` : base;
}

function contentStore() {
  return getStore({ name: name('content'), consistency: 'strong' });
}
export function mediaStore() {
  return getStore({ name: name('media'), consistency: 'strong' });
}
export function securityStore() {
  return getStore({ name: name('security'), consistency: 'strong' });
}
export function messagesStore() {
  return getStore({ name: name('messages'), consistency: 'strong' });
}
export function cacheStore() {
  return getStore({ name: name('cache') });
}

/** Lit le contenu ; retombe sur le contenu initial si rien n'est enregistré ou si Blobs est indisponible. */
export async function readContent(): Promise<Content> {
  try {
    const raw = await contentStore().get(CONTENT_KEY, { type: 'json' });
    if (!raw) return structuredClone(seed);
    const parsed = contentSchema.safeParse(raw);
    return parsed.success ? migrate(parsed.data, seed) : structuredClone(seed);
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
