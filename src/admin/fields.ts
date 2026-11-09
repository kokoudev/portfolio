import type { CollectionName } from '../lib/schema';

export type FieldType = 'text' | 'textarea' | 'url' | 'select' | 'checkbox' | 'file';
export interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: [string, string][];
  hint?: string;
  accept?: string;
}

export const tabs: { key: CollectionName | 'video' | 'messages'; label: string }[] = [
  { key: 'projects', label: 'Projets' },
  { key: 'formations', label: 'Formations' },
  { key: 'certifications', label: 'Certifications' },
  { key: 'diplomas', label: 'Diplômes' },
  { key: 'video', label: 'Vidéo de soutenance' },
  { key: 'messages', label: 'Messages' },
];

const IMG = 'image/png,image/jpeg,image/webp,image/avif';

export const fields: Record<CollectionName, Field[]> = {
  projects: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'badge', label: 'Badge (ex. EN LIGNE, CLIENT)', type: 'text' },
    { name: 'category', label: 'Catégorie', type: 'select', options: [['web', 'Web'], ['client', 'Client'], ['iot', 'IoT'], ['autre', 'Autre']] },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'problem', label: 'Problème (étude de cas)', type: 'textarea' },
    { name: 'solution', label: 'Solution (étude de cas)', type: 'textarea' },
    { name: 'stack', label: 'Technologies', type: 'text' },
    { name: 'url', label: 'Lien (https://…)', type: 'url' },
    { name: 'cta', label: 'Texte du lien', type: 'text' },
    { name: 'image', label: 'Capture', type: 'file', accept: IMG, hint: 'Vérifiez qu’aucun numéro de téléphone n’apparaît sur la capture.' },
    { name: 'imageAlt', label: 'Description de la capture (accessibilité)', type: 'text' },
    { name: 'featured', label: 'Mettre en avant (étude de cas)', type: 'checkbox' },
  ],
  formations: [
    { name: 'year', label: 'Année(s)', type: 'text', required: true },
    { name: 'title', label: 'Diplôme / formation', type: 'text', required: true },
    { name: 'school', label: 'Établissement', type: 'text' },
    { name: 'detail', label: 'Détail', type: 'text' },
    { name: 'current', label: 'En cours', type: 'checkbox' },
  ],
  certifications: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'issuer', label: 'Organisme', type: 'text' },
    { name: 'date', label: 'Date', type: 'text' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'image', label: 'Image du certificat', type: 'file', accept: IMG },
    { name: 'verifyUrl', label: 'Lien de vérification (https://…)', type: 'url' },
  ],
  diplomas: [
    { name: 'title', label: 'Titre', type: 'text', required: true },
    { name: 'status', label: 'Statut', type: 'text' },
    { name: 'file', label: 'Fichier (PDF ou image)', type: 'file', accept: `${IMG},application/pdf` },
    { name: 'link', label: 'Lien (facultatif)', type: 'url' },
  ],
};

export function emptyItem(c: CollectionName): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  for (const f of fields[c]) base[f.name] = f.type === 'checkbox' ? false : f.type === 'select' ? f.options?.[0]?.[0] : '';
  if (c === 'projects') base.gallery = [];
  return base;
}

export function summary(c: CollectionName, it: Record<string, unknown>): { title: string; meta: string } {
  const s = (k: string) => String(it[k] ?? '');
  switch (c) {
    case 'projects': return { title: s('title'), meta: [s('badge'), s('stack')].filter(Boolean).join(' · ') };
    case 'formations': return { title: s('title'), meta: [s('year'), s('school')].filter(Boolean).join(' · ') };
    case 'certifications': return { title: s('title'), meta: [s('issuer'), s('date'), it.verifyUrl ? 'lien ✓' : 'sans lien'].filter(Boolean).join(' · ') };
    case 'diplomas': return { title: s('title'), meta: s('status') };
  }
}
