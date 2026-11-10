/**
 * Adresse publique du site — SEULE source de vérité.
 * Canonical, Open Graph, sitemap.xml, robots.txt, llms.txt et JSON-LD en dérivent tous.
 * Pour passer à un nom de domaine personnel : définir la variable SITE_URL sur Netlify
 * (ex. https://kokoudev.com), ou changer la valeur par défaut ci-dessous, puis redéployer.
 */
export const SITE_URL = (process.env.SITE_URL || 'https://kokoudev.netlify.app').replace(/\/+$/, '');
