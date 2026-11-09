import type { ImageMetadata } from 'astro';
import portrait from '../assets/photo/portrait.jpg';
import visionAdmin from '../assets/projects/vision-admin.png';
import visionTracking from '../assets/projects/vision-tracking.png';
import gamedi from '../assets/projects/gamedi.png';
import stanfordDC from '../assets/certs/stanford-divide-conquer.jpg';
import stanfordGS from '../assets/certs/stanford-graph-search.jpg';
import stanfordGD from '../assets/certs/stanford-greedy-dp.jpg';
import cisco from '../assets/certs/cisco-cybersecurity-essentials.jpg';
import fortinet from '../assets/certs/fortinet-fca.jpg';
import glLinux from '../assets/certs/greatlearning-linux.jpg';
import glAppsec from '../assets/certs/greatlearning-appsec.jpg';

/** Images embarquées au build (optimisées en AVIF/WebP par Astro). Référencées par "asset:<nom>". */
export const assets: Record<string, ImageMetadata> = {
  portrait,
  'vision-admin': visionAdmin,
  'vision-tracking': visionTracking,
  gamedi,
  'stanford-divide-conquer': stanfordDC,
  'stanford-graph-search': stanfordGS,
  'stanford-greedy-dp': stanfordGD,
  'cisco-cybersecurity-essentials': cisco,
  'fortinet-fca': fortinet,
  'greatlearning-linux': glLinux,
  'greatlearning-appsec': glAppsec,
};

export type Resolved =
  | { kind: 'asset'; meta: ImageMetadata }
  | { kind: 'media'; src: string; isPdf: boolean }
  | null;

export function resolveImage(ref: string | undefined): Resolved {
  if (!ref) return null;
  if (ref.startsWith('asset:')) {
    const meta = assets[ref.slice(6)];
    return meta ? { kind: 'asset', meta } : null;
  }
  if (ref.startsWith('media:')) {
    const key = ref.slice(6);
    if (!/^[a-z0-9-]+\.(png|jpe?g|webp|avif|pdf)$/.test(key)) return null;
    return { kind: 'media', src: `/media/${key}`, isPdf: key.endsWith('.pdf') };
  }
  return null;
}

/** URL optimisée via le CDN d'images de Netlify pour les fichiers envoyés depuis l'admin. */
export function cdnUrl(src: string, width: number) {
  if (import.meta.env.DEV) return src;
  return `/.netlify/images?url=${encodeURIComponent(src)}&w=${width}&fm=avif&q=70`;
}
