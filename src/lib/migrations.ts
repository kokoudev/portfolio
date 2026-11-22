import type { Content, Project } from './schema';

/**
 * Migrations du contenu enregistré dans Netlify Blobs.
 * Le contenu initial (seed.ts) est déjà à jour ; ces migrations mettent à niveau un contenu
 * enregistré AVANT un changement, sans écraser ce que le propriétaire a modifié depuis l'admin :
 * un champ n'est remplacé que s'il contient encore l'ancienne valeur d'origine.
 */
export const MIGRATION_IDS = ['preuves-2026-11', 'fortinet-lien-2026-11', 'fortinet-retour-2026-11', 'soutenance-2026-11'] as const;

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

const STEPS: Record<(typeof MIGRATION_IDS)[number], (c: Content, seed: Content) => Content> = {
  'preuves-2026-11': preuves,
  'fortinet-lien-2026-11': fortinetLien,
  'fortinet-retour-2026-11': fortinetRetour,
  'soutenance-2026-11': soutenance,
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
