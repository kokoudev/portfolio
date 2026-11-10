/** Couches techniques d'un projet (« Ce que j'ai construit »). Partagé par le site et l'admin. */
export const LAYERS = ['interface', 'api', 'db', 'auth', 'deploy', 'mobile', 'embedded'] as const;
export type Layer = (typeof LAYERS)[number];

export const LAYER_LABEL: Record<Layer, string> = {
  interface: 'Interface',
  api: 'API / Backend',
  db: 'Base de données',
  auth: 'Authentification',
  deploy: 'Déploiement',
  mobile: 'Mobile',
  embedded: 'Embarqué',
};
