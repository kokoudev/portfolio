import type { Content, Project } from './schema';

/**
 * Migrations du contenu enregistré dans Netlify Blobs.
 * Le contenu initial (seed.ts) est déjà à jour ; ces migrations mettent à niveau un contenu
 * enregistré AVANT un changement, sans écraser ce que le propriétaire a modifié depuis l'admin :
 * un champ n'est remplacé que s'il contient encore l'ancienne valeur d'origine.
 */
export const MIGRATION_IDS = ['preuves-2026-11'] as const;

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

const STEPS: Record<(typeof MIGRATION_IDS)[number], (c: Content, seed: Content) => Content> = {
  'preuves-2026-11': preuves,
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
