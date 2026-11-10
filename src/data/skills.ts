/**
 * Compétences regroupées par couche. Chaque compétence cite le ou les projets qui la prouvent
 * (identifiants de projets → lien vers la carte #projet-<id>). Rien sans preuve.
 */
export type Skill = { name: string; proofs: string[]; note?: string };
export type SkillLayer = { layer: string; skills: Skill[]; extra?: { label: string; href: string } };

export const skillLayers: SkillLayer[] = [
  {
    layer: 'Interface',
    skills: [
      { name: 'HTML / CSS', proofs: ['gamedi', 'it232'] },
      { name: 'JavaScript', proofs: ['algovisualizer'] },
    ],
  },
  {
    layer: 'Backend',
    skills: [
      { name: 'AdonisJS', proofs: ['vision', 'givvly'] },
      { name: 'Python', proofs: ['algovisualizer'] },
      { name: 'PHP / Symfony', proofs: ['it232'] },
    ],
  },
  {
    layer: 'Données',
    skills: [{ name: 'MySQL', proofs: ['vision', 'givvly'] }],
  },
  {
    layer: 'Mobile',
    skills: [{ name: 'Flutter', proofs: ['vision'] }],
  },
  {
    layer: 'Embarqué',
    skills: [
      { name: 'ESP32', proofs: ['vision'], note: 'en prototypage' },
      { name: 'MQTT', proofs: ['vision'], note: 'prévu' },
    ],
  },
  {
    layer: 'Déploiement',
    skills: [
      { name: 'Git', proofs: [], note: 'tous les dépôts' },
      { name: 'Railway', proofs: ['algovisualizer'] },
      { name: 'Netlify', proofs: ['gamedi'] },
    ],
    extra: { label: 'github.com/kokoudev ↗', href: 'https://github.com/kokoudev' },
  },
  {
    layer: 'IA',
    skills: [{ name: 'Assistants et agents de code', proofs: [], note: 'ce portfolio : commits co-écrits avec un agent' }],
    extra: { label: 'dépôt du portfolio ↗', href: 'https://github.com/kokoudev/portfolio/commits/main' },
  },
];

/** Noms courts des compétences, réutilisés pour le SEO (JSON-LD knowsAbout, llms.txt). */
export const skillNames = skillLayers.flatMap((l) => l.skills.map((s) => s.name));
