import { z } from 'zod';

/** Texte court nettoyé : pas de caractères de contrôle. */
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ''));

/** URL https uniquement (ou chemin interne / ancre) — bloque javascript:, data:, etc. */
export const safeUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === '' || /^https:\/\/[^\s<>"']+$/i.test(v) || /^\/(?!\/)[\w\-./#?=&%]*$/.test(v) || /^#[\w-]*$/.test(v),
    { message: 'URL invalide : utilisez https://, un chemin /… ou une ancre #…' },
  );

/**
 * Référence d'image : soit un asset embarqué au build ("asset:nom"),
 * soit un fichier envoyé depuis l'admin ("media:<clé>").
 */
export const imageRef = z
  .string()
  .trim()
  .max(120)
  .refine((v) => v === '' || /^asset:[a-z0-9-]+$/.test(v) || /^media:[a-z0-9-]+\.(png|jpe?g|webp|avif|pdf)$/.test(v), {
    message: 'Référence de fichier invalide',
  });

const id = z.string().regex(/^[a-z0-9-]{1,64}$/);

export const projectSchema = z.object({
  id,
  title: text(120).pipe(z.string().min(1)),
  badge: text(40),
  category: z.enum(['web', 'client', 'iot', 'autre']),
  description: text(600),
  stack: text(200),
  url: safeUrl,
  cta: text(60),
  image: imageRef,
  imageAlt: text(200),
  gallery: z.array(z.object({ image: imageRef, alt: text(200) })).max(6).default([]),
  featured: z.boolean().default(false),
  problem: text(300).default(''),
  solution: text(400).default(''),
});

export const formationSchema = z.object({
  id,
  year: text(20).pipe(z.string().min(1)),
  title: text(120).pipe(z.string().min(1)),
  school: text(160),
  detail: text(200).default(''),
  current: z.boolean().default(false),
});

export const certificationSchema = z.object({
  id,
  title: text(160).pipe(z.string().min(1)),
  issuer: text(120),
  date: text(60),
  description: text(300).default(''),
  image: imageRef,
  verifyUrl: safeUrl,
});

export const diplomaSchema = z.object({
  id,
  title: text(160).pipe(z.string().min(1)),
  status: text(120),
  file: imageRef,
  link: safeUrl.default(''),
});

export const videoSchema = z.object({
  youtubeId: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[A-Za-z0-9_-]{11}$/.test(v), { message: 'Identifiant YouTube invalide (11 caractères)' }),
  title: text(160),
  caption: text(300),
});

export const contentSchema = z.object({
  projects: z.array(projectSchema).max(50),
  formations: z.array(formationSchema).max(30),
  certifications: z.array(certificationSchema).max(60),
  diplomas: z.array(diplomaSchema).max(20),
  video: videoSchema,
});

export type Project = z.infer<typeof projectSchema>;
export type Formation = z.infer<typeof formationSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Diploma = z.infer<typeof diplomaSchema>;
export type Video = z.infer<typeof videoSchema>;
export type Content = z.infer<typeof contentSchema>;

export const collections = {
  projects: projectSchema,
  formations: formationSchema,
  certifications: certificationSchema,
  diplomas: diplomaSchema,
} as const;
export type CollectionName = keyof typeof collections;

export const contactSchema = z.object({
  name: text(100).pipe(z.string().min(2, 'Nom trop court')),
  email: z.string().trim().max(200).pipe(z.email('Email invalide')),
  message: text(4000).pipe(z.string().min(10, 'Message trop court')),
  website: z.string().max(0).optional().default(''), // pot de miel anti-robot
  'cf-turnstile-response': z.string().min(1, 'Vérification anti-robot manquante').max(4096),
});
