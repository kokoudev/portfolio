import type { Content } from './schema';
import { skillNames } from '../data/skills';

/** Identité unique, réutilisée partout (balises, JSON-LD, llms.txt) pour des signaux cohérents. */
export const identity = {
  name: 'SOEDJE Kokou Ariel Caesar',
  alias: 'kokoudev',
  alternateNames: ['kokoudev', 'Kokou Dev', 'Kokou Ariel Caesar SOEDJE', 'Ariel Caesar SOEDJE'],
  jobTitle: 'Développeur web & mobile',
  city: 'Lomé',
  country: 'Togo',
  countryCode: 'TG',
  email: 'soedjekokouarielcaesar@gmail.com',
  phone: '+22897848880',
  phoneDisplay: '+228 97 84 88 80',
  github: 'https://github.com/kokoudev',
  school: 'IPNET Institute of Technology',
  skills: ['Développement web', 'Développement mobile', ...skillNames, 'Cybersécurité', 'Algorithmique'],
};

/** Données structurées schema.org (graphe) : ProfilePage + Person + WebSite + projets + diplômes. */
export function buildJsonLd(site: URL, imageUrl: string, content?: Content) {
  const base = site.toString().replace(/\/$/, '');
  const personId = `${base}/#person`;
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      '@id': `${base}/#website`,
      url: `${base}/`,
      name: 'kokoudev',
      alternateName: [identity.name, 'kokoudev — portfolio'],
      inLanguage: 'fr',
      publisher: { '@id': personId },
    },
    {
      '@type': 'ProfilePage',
      '@id': `${base}/#profile`,
      url: `${base}/`,
      name: `${identity.alias} — ${identity.name}`,
      inLanguage: 'fr',
      isPartOf: { '@id': `${base}/#website` },
      mainEntity: { '@id': personId },
      dateModified: new Date().toISOString().slice(0, 10),
    },
    {
      '@type': 'Person',
      '@id': personId,
      name: identity.name,
      alternateName: identity.alternateNames,
      givenName: 'Kokou Ariel Caesar',
      familyName: 'SOEDJE',
      jobTitle: identity.jobTitle,
      description: `${identity.name}, alias ${identity.alias}, est un ${identity.jobTitle.toLowerCase()} basé à ${identity.city} (${identity.country}).`,
      url: `${base}/`,
      image: imageUrl,
      email: `mailto:${identity.email}`,
      telephone: identity.phone,
      address: { '@type': 'PostalAddress', addressLocality: identity.city, addressCountry: identity.countryCode },
      nationality: { '@type': 'Country', name: identity.country },
      sameAs: [identity.github],
      knowsAbout: identity.skills,
      alumniOf: { '@type': 'CollegeOrUniversity', name: identity.school, address: { '@type': 'PostalAddress', addressLocality: 'Lomé', addressCountry: 'TG' } },
      ...(content
        ? {
            hasCredential: content.certifications.map((c) => ({
              '@type': 'EducationalOccupationalCredential',
              name: c.title,
              credentialCategory: 'certificate',
              recognizedBy: { '@type': 'Organization', name: c.issuer },
              ...(c.verifyUrl ? { url: c.verifyUrl } : {}),
            })),
          }
        : {}),
    },
  ];
  if (content) {
    for (const p of content.projects) {
      graph.push({
        '@type': 'CreativeWork',
        name: p.title,
        description: p.description,
        creator: { '@id': personId },
        keywords: p.stack,
        ...(p.url.startsWith('https://') ? { url: p.url } : {}),
      });
    }
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

export const faq: [string, string][] = [
  ['Qui est kokoudev ?', `kokoudev est le pseudonyme de ${identity.name}, ${identity.jobTitle.toLowerCase()} basé à Lomé (Togo), diplômé en Licence Génie Logiciel à IPNET (2023 – 2026).`],
  ['Sur quoi travaille kokoudev ?', 'Des sites et des applications web et mobiles : VISION, un antivol connecté pour motos (application Flutter, API AdonisJS, base MySQL et panneau d’administration ; boîtier ESP32 en prototypage), Givvly, AlgoVisualizer et des sites vitrines pour des clients.'],
  ['Quelles technologies utilise-t-il ?', 'Interface : HTML/CSS et JavaScript. Backend : AdonisJS, Python et PHP/Symfony. Données : MySQL. Mobile : Flutter. Déploiement : Git, Railway et Netlify. Il a aussi une base en cybersécurité (Cisco, Fortinet) et en algorithmique (Stanford).'],
  ['Comment contacter kokoudev ?', `Par email à ${identity.email}, par téléphone au ${identity.phoneDisplay}, ou via GitHub (github.com/kokoudev).`],
  ['Est-il disponible ?', 'Oui : pour un emploi, un stage ou une mission, à Lomé ou à distance (fuseau GMT+0).'],
];

export function faqJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }).replace(/</g, '\\u003c');
}
