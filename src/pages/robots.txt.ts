import type { APIRoute } from 'astro';

export const prerender = true;

// Les moteurs de recherche ET les robots des IA (GEO) sont explicitement autorisés,
// sauf sur l'admin et l'API.
const bots = ['*', 'Googlebot', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot', 'Applebot-Extended', 'DuckDuckBot', 'YandexBot', 'meta-externalagent', 'CCBot'];

export const GET: APIRoute = ({ site }) => {
  const base = (site ?? new URL('https://kokoudev.netlify.app')).toString().replace(/\/$/, '');
  const rules = bots.map((b) => `User-agent: ${b}\nAllow: /\nAllow: /llms.txt\nDisallow: /admin\nDisallow: /api/\n`).join('\n');
  return new Response(`${rules}\nSitemap: ${base}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
