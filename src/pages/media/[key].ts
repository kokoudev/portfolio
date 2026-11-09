import type { APIRoute } from 'astro';
import { mediaStore } from '../../lib/store';

export const prerender = false;

/** Sert les fichiers envoyés depuis l'admin, avec des en-têtes qui empêchent toute exécution. */
export const GET: APIRoute = async ({ params }) => {
  const key = params.key ?? '';
  if (!/^[a-z0-9-]+\.(png|jpg|webp|avif|pdf)$/.test(key)) return new Response('Not found', { status: 404 });
  const res = await mediaStore().getWithMetadata(key, { type: 'arrayBuffer' });
  if (!res) return new Response('Not found', { status: 404 });
  const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'application/pdf'];
  const mime = typeof res.metadata?.mime === 'string' && allowed.includes(res.metadata.mime) ? res.metadata.mime : 'application/octet-stream';
  return new Response(res.data, {
    headers: {
      'Content-Type': mime,
      'Content-Disposition': `inline; filename="${key}"`,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });
};
