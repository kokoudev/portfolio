import type { APIRoute } from 'astro';
import { readContent } from '../lib/store';
import { identity, faq } from '../lib/seo';
import { LAYER_LABEL } from '../lib/layers';

export const prerender = false;

/**
 * llms.txt (https://llmstxt.org) : résumé factuel, en Markdown, destiné aux moteurs de réponse
 * (ChatGPT, Claude, Perplexity, Google AI Overviews…). Généré depuis le même contenu que le site.
 */
export const GET: APIRoute = async ({ site }) => {
  const c = await readContent();
  const base = String(site ?? import.meta.env.SITE).replace(/\/$/, '');
  const link = (u: string) => (u.startsWith('https://') ? u : u.startsWith('#') ? `${base}/${u}` : '');
  const lines = [
    `# kokoudev — ${identity.name}`,
    '',
    `> kokoudev est le pseudonyme de ${identity.name}, ${identity.jobTitle.toLowerCase()} basé à ${identity.city} (${identity.country}). Licence en Génie Logiciel à IPNET (2023 – 2026). Disponible pour un emploi, un stage ou une mission, sur site ou à distance.`,
    '',
    `- Site : ${base}/`,
    `- GitHub : ${identity.github}`,
    `- Email : ${identity.email}`,
    `- Téléphone professionnel : ${identity.phoneDisplay}`,
    `- Compétences : ${identity.skills.join(', ')}`,
    '',
    '## Projets',
    ...c.projects.map((p) => {
      const built = p.built.map((b) => `${LAYER_LABEL[b.layer]} : ${b.detail}${b.planned ? ' (prévu)' : ''}`).join(' ; ');
      return `- [${p.title}](${link(p.url) || `${base}/#projet-${p.id}`}) — ${p.badge}. ${p.description} Technologies : ${p.stack}.${built ? ` Ce qu’il a construit : ${built}.` : ''}${p.status ? ` Statut : ${p.status}.` : ''}`;
    }),
    '',
    '## Formation (du plus ancien au plus récent)',
    ...c.formations.map((f) => `- ${f.year} — ${f.title}, ${f.school}${f.detail ? ` (${f.detail})` : ''}`),
    '',
    '## Certifications',
    ...c.certifications.map((x) => `- ${x.title} — ${x.issuer}, ${x.date}${x.verifyUrl ? ` — vérification : ${x.verifyUrl}` : ''}`),
    '',
    '## Questions fréquentes',
    ...faq.flatMap(([q, a]) => [`### ${q}`, a, '']),
  ];
  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=3600, stale-while-revalidate=604800',
      'Netlify-Cache-Tag': 'content',
      'Netlify-Vary': 'query=none',
    },
  });
};
