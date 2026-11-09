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
      'Content-Disposition': `${mime === 'application/pdf' ? 'attachment' : 'inline'}; filename="${key}"`,
      // navigateur : 1 jour ; CDN : longue durée mais purgé à la suppression (étiquette par fichier)
      'Cache-Control': 'public, max-age=86400',
      'Netlify-CDN-Cache-Control': 'public, durable, max-age=31536000',
      'Netlify-Cache-Tag': `media-${key}`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  });
};
