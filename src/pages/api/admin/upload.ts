import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';
import { purgeCache } from '@netlify/cache';
import { mediaStore } from '../../../lib/store';
import { json, MAX_UPLOAD_BYTES, sniffType } from '../../../lib/security';

export const prerender = false;

/** Envoi d'une image (PNG, JPEG, WebP, AVIF) ou d'un PDF. Le type est vérifié par les octets, pas par le nom. */
export const POST: APIRoute = async ({ request }) => {
  const lenHeader = request.headers.get('content-length');
  if (!lenHeader) return json({ error: 'Longueur requise' }, 411);
  if (Number(lenHeader) > MAX_UPLOAD_BYTES + 64 * 1024) return json({ error: 'Fichier trop lourd (5 Mo max)' }, 413);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Formulaire invalide' }, 400);
  }
  const file = form.get('file');
  if (!(file instanceof File)) return json({ error: 'Aucun fichier' }, 400);
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) return json({ error: 'Fichier vide ou trop lourd (5 Mo max)' }, 413);

  const buf = new Uint8Array(await file.arrayBuffer());
  const type = sniffType(buf);
  if (!type) return json({ error: 'Type refusé : PNG, JPEG, WebP, AVIF ou PDF uniquement' }, 415);

  // Nom généré côté serveur : aucun nom fourni par l'utilisateur n'est réutilisé
  const key = `${Date.now().toString(36)}-${randomBytes(8).toString('hex')}.${type.ext}`;
  await mediaStore().set(key, buf.buffer as ArrayBuffer, { metadata: { mime: type.mime, size: file.size } });
  return json({ ref: `media:${key}`, mime: type.mime });
};

export const DELETE: APIRoute = async ({ url }) => {
  const key = url.searchParams.get('key') ?? '';
  if (!/^[a-z0-9-]+\.(png|jpg|webp|avif|pdf)$/.test(key)) return json({ error: 'Clé invalide' }, 400);
  await mediaStore().delete(key);
  try {
    await purgeCache({ tags: [`media-${key}`] }); // le fichier supprimé n'est plus servi par le CDN
  } catch {
    /* hors Netlify (dev) */
  }
  return json({ ok: true });
};
