import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const base = String(site ?? import.meta.env.SITE).replace(/\/$/, '');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${base}/</loc>
    <lastmod>${__BUILD_DATE__}</lastmod>
    <image:image><image:loc>${base}/portrait.jpg</image:loc></image:image>
    <image:image><image:loc>${base}/og.png</image:loc></image:image>
  </url>
</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
