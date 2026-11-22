import type { Content, Project } from './schema';

/**
 * Migrations du contenu enregistré dans Netlify Blobs.
 * Le contenu initial (seed.ts) est déjà à jour ; ces migrations mettent à niveau un contenu
 * enregistré AVANT un changement, sans écraser ce que le propriétaire a modifié depuis l'admin :
 * un champ n'est remplacé que s'il contient encore l'ancienne valeur d'origine.
 */
export const MIGRATION_IDS = ['preuves-2026-11', 'fortinet-lien-2026-11', 'fortinet-retour-2026-11', 'soutenance-2026-11', 'data-challenge-liens-2026-11', 'sans-video-2026-11', 'coherence-2026-11', 'reponses-2026-11'] as const;

/** Anciennes valeurs d'origine (avant la migration « preuves-2026-11 »). */
const OLD: Record<string, Partial<Record<keyof Project, string>>> = {
  vision: {
    description:
      'Antivol connecté pour motos : un boîtier embarqué localise la moto en temps réel et permet de couper le moteur à distance depuis l’application.',
    solution:
      'Un boîtier ESP32-S3 avec modem 4G envoie sa position par MQTT ; l’app affiche la carte, les trajets, la zone de sécurité (géofencing) et commande l’arrêt moteur, refusé si la moto roule.',
    stack: 'AdonisJS · Flutter · ESP32-S3 · MQTT (EMQX) · Redis · MySQL · PASETO',
    imageAlt: 'Tableau de bord d’administration de VISION (données de démonstration)',
  },
  algovisualizer: {
    badge: 'EN LIGNE',
    stack: 'Python · JavaScript · Railway',
    url: 'https://web-production-2e739.up.railway.app',
    cta: 'Voir le site ↗',
  },
};
const OLD_ALT: Record<string, string> = {
  'Module de localisation de VISION : carte, trajet et arrêt moteur (données de démonstration)':
    'Module de localisation de VISION (écran recréé, données de démonstration)',
};

function preuves(c: Content, seed: Content): Content {
  const fresh = new Map(seed.projects.map((p) => [p.id, p]));
  const projects = c.projects.map((p) => {
    const s = fresh.get(p.id);
    if (!s) return p;
    const next: Project = { ...p };
    for (const [k, old] of Object.entries(OLD[p.id] ?? {}) as [keyof Project, string][]) {
      if (p[k] === old) (next as Record<string, unknown>)[k] = s[k];
    }
    if (next.built.length === 0) next.built = s.built;
    if (!next.status) next.status = s.status;
    next.gallery = next.gallery.map((g) => (OLD_ALT[g.alt] ? { ...g, alt: OLD_ALT[g.alt] } : g));
    return next;
  });
  const has = (id: string) => projects.some((p) => p.id === id);
  // Givvly juste après VISION (deuxième preuve de bout en bout), IT232 à la fin.
  const givvly = fresh.get('givvly');
  if (givvly && !has('givvly')) {
    const i = projects.findIndex((p) => p.id === 'vision');
    projects.splice(i >= 0 ? i + 1 : 0, 0, givvly);
  }
  const it232 = fresh.get('it232');
  if (it232 && !has('it232')) projects.push(it232);
  return { ...c, projects };
}

/** Annulée : le certificat Fortinet indique bien cette page comme page de vérification (voir étape suivante). */
function fortinetLien(c: Content): Content {
  return c;
}

/** Rétablit le lien de vérification Fortinet et ajoute le numéro de validation imprimé sur le certificat. */
const FORTINET_URL = 'https://training.fortinet.com/admin/tool/certificate/index.php';
function fortinetRetour(c: Content): Content {
  return {
    ...c,
    certifications: c.certifications.map((x) =>
      x.id !== 'fortinet-fca'
        ? x
        : {
            ...x,
            verifyUrl: x.verifyUrl || FORTINET_URL,
            description: x.description === 'Fondamentaux de la cybersécurité et du paysage des menaces.' ? 'Fondamentaux de la cybersécurité et du paysage des menaces. N° de validation : 6038634386KA.' : x.description,
          },
    ),
  };
}

/** Soutenance passée (21 nov. 2026) et projet du Data Challenge ajouté après Givvly. Ne remplace que les valeurs d'origine. */
function soutenance(c: Content, seed: Content): Content {
  const swap = (v: string, old: string, neu: string) => (v === old ? neu : v);
  const projects = c.projects.map((p) =>
    p.id === 'vision' ? { ...p, badge: swap(p.badge, 'EN COURS · PROJET DE FIN D’ÉTUDES', 'PROJET DE FIN D’ÉTUDES · SOUTENU') } : p,
  );
  const tdc = seed.projects.find((p) => p.id === 'togo-soins');
  if (tdc && !projects.some((p) => p.id === tdc.id)) {
    const i = projects.findIndex((p) => p.id === 'givvly');
    projects.splice(i >= 0 ? i + 1 : projects.length, 0, tdc);
  }
  const formations = c.formations.map((f) =>
    f.id === 'licence' && f.detail === 'Soutenance à venir' ? { ...f, detail: 'Soutenue le 21 novembre 2026', current: false } : f,
  );
  const diplomas = c.diplomas.map((d) =>
    d.id === 'licence' ? { ...d, status: swap(d.status, 'À AJOUTER après la soutenance', 'Soutenue le 21 nov. 2026 · diplôme À AJOUTER') } : d,
  );
  const video = {
    ...c.video,
    caption: swap(c.video.caption, 'Présentation du projet de fin d’études devant le jury d’IPNET.', 'Projet de fin d’études présenté devant le jury d’IPNET le 21 novembre 2026.'),
  };
  return { ...c, projects, formations, diplomas, video };
}

/** Tableau de bord du Data Challenge en ligne : lien du site, dépôt GitHub, statut et couche déploiement. */
function dataChallengeLiens(c: Content): Content {
  return {
    ...c,
    projects: c.projects.map((p) =>
      p.id !== 'togo-soins'
        ? p
        : {
            ...p,
            url: p.url || 'https://acces-aux-soins-togo.vercel.app/',
            repoUrl: p.repoUrl || 'https://github.com/kokoudev/acces-aux-soins-togo',
            status: p.status === 'Tableau de bord en cours de déploiement · résultats du concours le 27 novembre 2026' ? 'Tableau de bord en ligne · résultats du concours le 27 novembre 2026' : p.status,
            built: p.built.map((b) => (b.layer === 'deploy' && b.planned && b.detail === 'Mise en ligne du tableau de bord' ? { layer: 'deploy' as const, detail: 'Déploiement Vercel', planned: false } : b)),
          },
    ),
  };
}

/** La section vidéo de soutenance est retirée : le lien de VISION mène au boîtier réel. */
function sansVideo(c: Content): Content {
  return {
    ...c,
    projects: c.projects.map((p) =>
      p.id === 'vision' && p.url === '#soutenance'
        ? { ...p, url: '#prototype-vision', cta: p.cta === 'Voir la soutenance →' ? 'Voir le boîtier en vrai ↓' : p.cta }
        : p,
    ),
  };
}

/** Audit de cohérence : libellé du boîtier sans doublon « (en prototypage) (prévu) », badge du concours. */
function coherence(c: Content): Content {
  return {
    ...c,
    projects: c.projects.map((p) => ({
      ...p,
      badge: p.id === 'togo-soins' && p.badge === 'CONCOURS · RÉSULTATS LE 27 NOV.' ? 'CONCOURS · RÉSULTATS LE 27/11' : p.badge,
      built: p.built.map((b) => (b.detail === 'Boîtier ESP32 (en prototypage)' ? { ...b, detail: 'Boîtier ESP32' } : b)),
    })),
  };
}

/** Réponses du propriétaire (22/11/2026) : Licence Professionnelle, rôle dans le Data Challenge, Android, GAMÉDI, ligne « certificats » retirée des diplômes. */
const OLD_TDC_DESC = 'Tableau de bord interactif réalisé en équipe pour le Data Challenge du Togo AI Lab : quelles populations sont les plus éloignées d’un centre de santé, et où agir en priorité ? 396 cantons analysés, avec des données issues à 100 % de opendata.gouv.tg et geodata.gouv.tg.';
function reponses(c: Content, seed: Content): Content {
  const fresh = new Map(seed.projects.map((p) => [p.id, p]));
  const projects = c.projects.map((p) => {
    if (p.id === 'togo-soins') {
      const t = fresh.get('togo-soins');
      if (!t) return p;
      return {
        ...p,
        description: p.description === OLD_TDC_DESC ? t.description : p.description,
        built: p.built.some((b) => b.detail === 'Tableau de bord Plotly Dash : cartes, filtres, export CSV') ? t.built : p.built,
      };
    }
    if (p.id === 'vision') {
      return { ...p, built: p.built.map((b) => (b.layer === 'mobile' && b.detail === 'Application Flutter' ? { ...b, detail: 'Application Flutter (Android, mises à jour par APK)' } : b)) };
    }
    if (p.id === 'gamedi' && p.stack === 'Netlify · Responsive · SEO') return { ...p, stack: 'HTML · CSS · JavaScript · Netlify' };
    return p;
  });
  const formations = c.formations.map((f) => (f.id === 'licence' && f.title === 'Licence en Génie Logiciel' ? { ...f, title: 'Licence Professionnelle en Génie Logiciel' } : f));
  const diplomas = c.diplomas
    .filter((d) => !(d.id === 'certificats' && d.link === '#certifications'))
    .map((d) => (d.id === 'licence' && d.title === 'Licence en Génie Logiciel — IPNET' ? { ...d, title: 'Licence Professionnelle en Génie Logiciel — IPNET' } : d));
  return { ...c, projects, formations, diplomas };
}

const STEPS: Record<(typeof MIGRATION_IDS)[number], (c: Content, seed: Content) => Content> = {
  'preuves-2026-11': preuves,
  'fortinet-lien-2026-11': fortinetLien,
  'fortinet-retour-2026-11': fortinetRetour,
  'soutenance-2026-11': soutenance,
  'data-challenge-liens-2026-11': dataChallengeLiens,
  'sans-video-2026-11': sansVideo,
  'coherence-2026-11': coherence,
  'reponses-2026-11': reponses,
};

/** Applique les migrations manquantes (idempotent). */
export function migrate(c: Content, seed: Content): Content {
  let out = c;
  for (const id of MIGRATION_IDS) {
    if (out.migrations.includes(id)) continue;
    out = STEPS[id](out, seed);
    out = { ...out, migrations: [...out.migrations, id] };
  }
  return out;
}
