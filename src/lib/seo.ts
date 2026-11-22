import type { Content } from './schema';
import { skillNames } from '../data/skills';

/** Identité unique, réutilisée partout (balises, JSON-LD, llms.txt) pour des signaux cohérents. */
export const identity = {
  name: 'SOEDJE Kokou Ariel Caesar',
  alias: 'kokoudev',
  /** Variantes réellement utilisées : pseudo, nom LinkedIn (« Ariel Soedje »), ordre prénom + nom. */
  alternateNames: ['kokoudev', 'Ariel Soedje', 'Kokou Ariel Soedje', 'Kokou Ariel Caesar SOEDJE', 'Ariel Caesar SOEDJE', 'Kokou Dev'],
  shortName: 'Ariel Soedje',
  jobTitle: 'Développeur web & mobile',
  city: 'Lomé',
  country: 'Togo',
  countryCode: 'TG',
  email: 'soedjekokouarielcaesar@gmail.com',
  phone: '+22897848880',
  phoneDisplay: '+228 97 84 88 80',
  github: 'https://github.com/kokoudev',
  linkedin: 'https://www.linkedin.com/in/kokoudev/',
  school: 'IPNET Institute of Technology',
  skills: ['Développement web', 'Développement mobile', ...skillNames, 'Cybersécurité', 'Algorithmique'],
};

/** Données structurées schema.org (graphe) : ProfilePage + Person + WebSite + projets + diplômes. */
export function buildJsonLd(site: URL, portraitUrl: string, content?: Content) {
  const base = site.toString().replace(/\/$/, '');
  const personId = `${base}/#person`;
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      '@id': `${base}/#website`,
      url: `${base}/`,
      name: 'kokoudev',
      alternateName: [identity.name, identity.shortName, 'kokoudev — portfolio'],
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
      about: { '@id': personId },
      primaryImageOfPage: { '@id': `${base}/#portrait` },
      dateModified: __BUILD_DATE__,
    },
    {
      '@type': 'Person',
      '@id': personId,
      name: identity.name,
      alternateName: identity.alternateNames,
      givenName: 'Kokou Ariel Caesar',
      familyName: 'SOEDJE',
      jobTitle: identity.jobTitle,
      additionalName: 'Ariel',
      description: `${identity.name} (${identity.shortName}), alias ${identity.alias}, est un ${identity.jobTitle.toLowerCase()} basé à ${identity.city} (${identity.country}).`,
      url: `${base}/`,
      image: {
        '@type': 'ImageObject',
        '@id': `${base}/#portrait`,
        url: portraitUrl,
        contentUrl: portraitUrl,
        width: 600,
        height: 600,
        caption: `Portrait de ${identity.name} (${identity.alias})`,
      },
      mainEntityOfPage: { '@id': `${base}/#profile` },
      knowsLanguage: ['fr', 'en', 'ee'],
      hasOccupation: {
        '@type': 'Occupation',
        name: identity.jobTitle,
        occupationLocation: { '@type': 'City', name: identity.city },
        skills: identity.skills.join(', '),
      },
      email: `mailto:${identity.email}`,
      telephone: identity.phone,
      address: { '@type': 'PostalAddress', addressLocality: identity.city, addressCountry: identity.countryCode },
      nationality: { '@type': 'Country', name: identity.country },
      sameAs: [identity.github, identity.linkedin],
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
      const repoUrl = p.repoUrl || (p.url.startsWith('https://github.com/') ? p.url : '');
      const repo = repoUrl !== '';
      graph.push({
        '@type': repo ? 'SoftwareSourceCode' : p.category === 'client' ? 'WebSite' : 'CreativeWork',
        '@id': `${base}/#projet-${p.id}`,
        name: p.title,
        description: p.description,
        creator: { '@id': personId },
        isPartOf: { '@id': `${base}/#profile` },
        keywords: p.stack,
        url: p.url.startsWith('https://') ? p.url : `${base}/#projet-${p.id}`,
        ...(repo ? { codeRepository: repoUrl } : {}),
      });
    }
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

export const faq: [string, string][] = [
  ['Qui est kokoudev ?', `kokoudev est le pseudonyme de ${identity.name}, ou ${identity.shortName} sur LinkedIn, ${identity.jobTitle.toLowerCase()} basé à Lomé (Togo), qui a soutenu sa Licence Professionnelle en Génie Logiciel à IPNET (2023 – 2026) le 21 novembre 2026.`],
  ['Sur quoi travaille kokoudev ?', 'Des sites et des applications web et mobiles : VISION, un antivol connecté pour motos et son projet de fin d’études (application Flutter, API AdonisJS, base MySQL et panneau d’administration ; boîtier ESP32 en prototypage), Givvly (plateforme de dons), un tableau de bord sur l’accès aux soins au Togo réalisé en équipe pour le Data Challenge du Togo AI Lab, AlgoVisualizer, une application Symfony de gestion des soutenances et le site vitrine d’un client (GAMÉDI).'],
  ['Quelles technologies utilise-t-il ?', 'Interface : HTML/CSS, JavaScript, React et Plotly Dash. Backend : AdonisJS, Python et PHP/Symfony. Données : MySQL, pandas et GeoPandas. Mobile : Flutter. Déploiement : Git, Netlify, Vercel et Railway. Il a aussi une base en cybersécurité (Cisco, Fortinet) et en algorithmique (Stanford).'],
  ['Comment contacter kokoudev ?', `Par email à ${identity.email}, par téléphone au ${identity.phoneDisplay}, ou via LinkedIn et GitHub (github.com/kokoudev).`],
  ['Est-il disponible ?', 'Oui, immédiatement : pour un emploi, un stage ou une mission, à Lomé ou à distance (fuseau GMT+0).'],
  ['Quelles langues parle-t-il ?', 'Français (courant), éwé (langue maternelle) et anglais (compréhension).'],
];

export function faqJsonLd() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }).replace(/</g, '\\u003c');
}
