# Portfolio — SOEDJE Kokou Ariel Caesar

Portfolio personnel de **SOEDJE Kokou Ariel Caesar**, développeur web & full-stack junior à Lomé (Togo), Licence en Génie Logiciel (IPNET).

Esthétique « solarpunk + punk » : fond quadrillé `#07100D`, vert néon `#B6FF5C`, rose `#FF4FB8`, polices Unbounded / Space Grotesk / JetBrains Mono (auto-hébergées), lianes SVG qui poussent, feuilles qui éclosent, spores lumineuses, orbite autour de la photo. Toutes les animations respectent `prefers-reduced-motion`.

**Stack** : [Astro 6](https://astro.build) (rendu serveur) + îlots React 19 · [Netlify](https://www.netlify.com) (Functions, Blobs, Image CDN) · [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) · sessions [PASETO v4.local](https://paseto.io).

---

## Sommaire
1. [Structure](#structure)
2. [Installation locale](#installation-locale)
3. [Déploiement sur Netlify](#déploiement-sur-netlify)
4. [Utiliser l'espace admin](#utiliser-lespace-admin)
5. [Sécurité](#sécurité)
6. [Performance](#performance)
7. [Limites gratuites](#limites-gratuites)
8. [Contenus à compléter](#contenus-à-compléter)

---

## Structure

```
├─ astro.config.mjs          configuration (adaptateur Netlify, CSP stricte)
├─ netlify.toml              build + en-têtes de sécurité
├─ public/                   polices woff2, favicon, robots.txt
├─ scripts/setup-admin.mjs   génère le hash du mot de passe et la clé PASETO
├─ src/
│  ├─ assets/                photo, certificats, captures (optimisés en AVIF/WebP au build)
│  ├─ data/seed.ts           contenu initial (utilisé tant que l'admin n'a rien enregistré)
│  ├─ components/sections/   Accueil, Projets, Formation, Certifications, Soutenance, Diplômes, Contact
│  ├─ admin/                 application React de l'admin (onglets, glisser-déposer, envoi de fichiers)
│  ├─ lib/                   auth (PASETO, scrypt), sécurité, stockage Blobs, schémas zod, GitHub
│  ├─ middleware.ts          protection de /admin et /api/admin, CSRF, en-têtes
│  └─ pages/
│     ├─ index.astro         page publique
│     ├─ admin/              /admin et /admin/login
│     ├─ api/                contact, login, contenu, envoi de fichiers, messages
│     └─ media/[key].ts      fichiers envoyés depuis l'admin
└─ tools/screens/            maquettes HTML des captures VISION (données de démonstration)
```

## Installation locale

Prérequis : **Node.js ≥ 22.23.4** (exigé par Astro 7), npm.

```bash
git clone https://github.com/kokoudev/portfolio.git
cd portfolio
npm install
cp .env.example .env
node scripts/setup-admin.mjs   # demande un nom et un mot de passe (16 caractères min.)
```

Copiez les trois lignes affichées (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `PASETO_LOCAL_KEY`) dans `.env`, puis :

```bash
npm run dev        # http://localhost:4321  —  admin : http://localhost:4321/admin
```

En local, Netlify Blobs est émulé automatiquement et Turnstile utilise les **clés de test officielles** de Cloudflare (le widget passe toujours). Le fichier `.env` n'est **jamais** commité.

## Déploiement sur Netlify

Le projet Netlify **`kokoudev`** existe déjà : **https://kokoudev.netlify.app**.

1. Déploiement continu : [app.netlify.com/projects/kokoudev](https://app.netlify.com/projects/kokoudev) → **Project configuration → Build & deploy → Link repository** → GitHub → `kokoudev/portfolio`. Les réglages de build sont lus dans `netlify.toml`.
2. **Project configuration → Environment variables**, ajoutez (pour les secrets, cochez « Contains secret values » et limitez le contexte à **Production**, pour qu'aucune prévisualisation de branche ou de pull request ne puisse les lire) :

   | Variable | Valeur |
   |---|---|
   | `ADMIN_USERNAME` | sortie de `setup-admin.mjs` |
   | `ADMIN_PASSWORD_HASH` | sortie de `setup-admin.mjs` |
   | `PASETO_LOCAL_KEY` | sortie de `setup-admin.mjs` (**secret**, cochez « Contains secret values ») |
   | `PUBLIC_TURNSTILE_SITE_KEY` | clé de site Turnstile |
   | `TURNSTILE_SECRET_KEY` | clé secrète Turnstile (**secret**) |
   | `GITHUB_USERNAME` | `kokoudev` |
   | `SITE_URL` | `https://kokoudev.netlify.app` |
   | `GITHUB_TOKEN` | facultatif : jeton « fine-grained » sans aucune permission |
   | `IP_HASH_SECRET` | facultatif : chaîne aléatoire (**secret**) pour pseudonymiser les IP |
   | `PUBLIC_GOOGLE_SITE_VERIFICATION` | facultatif : code de Google Search Console |
   | `PUBLIC_BING_SITE_VERIFICATION` | facultatif : code de Bing Webmaster Tools |

3. **Turnstile** : sur le tableau de bord Cloudflare → Turnstile → *Add widget*, mode « Managed », domaine = votre domaine Netlify. Copiez les deux clés.
4. Relancez un déploiement (**Deploys → Trigger deploy**). Chaque `git push` sur `main` redéploie automatiquement.

Sans `TURNSTILE_SECRET_KEY` en production, le formulaire de contact et la connexion admin sont **refusés** (sécurité par défaut).

## Utiliser l'espace admin

1. Ouvrez `https://<votre-site>/admin` → page de connexion (identifiant, mot de passe, vérification Turnstile).
2. Onglets : **Projets · Formations · Certifications · Diplômes · Vidéo de soutenance · Messages**.
3. Dans chaque onglet :
   - **+ Ajouter** ouvre le formulaire ; **Modifier** / **Supprimer** sur chaque ligne.
   - **Réordonner** : glissez la poignée `⋮⋮`, ou au clavier : Tab jusqu'à la poignée, **Espace**, flèches, **Espace**.
   - **Fichiers** : images PNG, JPEG, WebP, AVIF ou PDF, 5 Mo max (limite des fonctions Netlify). Le type est vérifié sur le contenu réel du fichier.
     ⚠️ Avant d'envoyer une capture, vérifiez qu'**aucun numéro de téléphone** n'y apparaît.
4. Chaque action est enregistrée immédiatement et le cache du site est purgé : la page publique se met à jour en quelques secondes.
5. **Vidéo de soutenance** : collez le lien YouTube (vidéo « non répertoriée »). Sur le site, la vidéo n'est chargée qu'au clic (youtube-nocookie).
6. **Messages** : les messages du formulaire de contact arrivent ici.
7. **Se déconnecter** révoque la session côté serveur. Une session expire de toute façon après 2 h.

**Changer de mot de passe** : relancez `node scripts/setup-admin.mjs`, remplacez les variables sur Netlify, redéployez. Changer `PASETO_LOCAL_KEY` déconnecte immédiatement toutes les sessions.

## Sécurité

| Menace | Protection |
|---|---|
| Vol de cookie (XSS) | Session dans un cookie `__Host-` **HttpOnly** (illisible en JavaScript), **Secure**, **SameSite=Strict** ; CSP stricte avec empreintes de scripts (aucun script inline non autorisé) |
| Jeton falsifié ou lu | **PASETO v4.local** : chiffré et authentifié (XChaCha20 + BLAKE2b), assertion implicite liée à l'application, vérification de `exp`, `aud`, `iss`, `sub` |
| Session volée réutilisée | Expiration 2 h, révocation côté serveur à la déconnexion, rotation possible de la clé |
| CSRF | SameSite=Strict + vérification de l'origine + jeton CSRF (stocké dans la session chiffrée) exigé sur chaque écriture |
| Force brute | scrypt (N = 2¹⁷), Turnstile lié à l'action « login » et au domaine, 5 échecs / 15 min par IP (IPv6 regroupées en /64) puis blocage 30 min, réponse en temps constant ; aucun verrou global (un attaquant ne peut pas bloquer le propriétaire) |
| Fuite de secrets | Secrets lus à l'exécution via `astro:env` (jamais copiés dans le code compilé), stores séparés pour les prévisualisations |
| Injection / XSS stocké | Validation zod de tout le contenu, URLs `https://` uniquement, échappement automatique d'Astro et React |
| Fichiers malveillants | Type détecté par les octets (pas de SVG ni HTML), nom généré par le serveur, servi avec `nosniff` + CSP `sandbox` |
| Clickjacking | `X-Frame-Options: DENY`, `frame-ancestors 'none'` |
| Spam | Turnstile, pot de miel, 3 messages / heure / IP |

Les IP ne sont jamais stockées en clair (empreinte SHA-256).

## Performance

- Rendu serveur mis en cache sur le CDN Netlify (`durable`, 1 h, `stale-while-revalidate`) et purgé à chaque modification dans l'admin.
- Images en **AVIF / WebP** avec `srcset`, chargement différé sauf la photo de l'accueil (prioritaire).
- Animations en **CSS / SVG uniquement** (pas de bibliothèque d'animation) ; moins de 3 Ko de JavaScript sur la page publique.
- Polices auto-hébergées en woff2, sous-ensemble latin, préchargées.
- Turnstile n'est chargé qu'à l'approche du formulaire ; la vidéo YouTube seulement au clic.

## Référencement : SEO et GEO (« kokoudev »)

Objectif : apparaître en premier pour « kokoudev », dans Google comme dans les assistants IA.

- **Domaine** `kokoudev.netlify.app`, logo, titre, H1 (« alias kokoudev »), FAQ « Qui est kokoudev ? ».
- **Données structurées** (`src/lib/seo.ts`) : `Person` avec `alternateName: kokoudev`, `ProfilePage`, `WebSite`, `FAQPage`, projets et certifications.
- **GEO** : `/llms.txt` (résumé factuel lisible par les IA, généré depuis le contenu de l'admin) ; `robots.txt` qui autorise explicitement GPTBot, ClaudeBot, PerplexityBot, Google-Extended…
- `sitemap.xml`, balise canonique, Open Graph `profile`, `rel="me"` vers GitHub.

**À faire de votre côté (5 minutes)** :
1. [Google Search Console](https://search.google.com/search-console) → ajouter `https://kokoudev.netlify.app` (méthode « balise HTML ») → copier le code dans `PUBLIC_GOOGLE_SITE_VERIFICATION` → redéployer → valider → **Sitemaps** : `sitemap.xml` → **Inspection d'URL** → « Demander une indexation ».
2. [Bing Webmaster Tools](https://www.bing.com/webmasters) → importer depuis Google Search Console (Bing alimente aussi ChatGPT Search et DuckDuckGo).
3. Profil GitHub → **Edit profile → Website** : `https://kokoudev.netlify.app`. Créez aussi un dépôt `kokoudev/kokoudev` (README de profil) avec le lien.
4. Mettez le même lien et le même pseudo partout (LinkedIn, CV, signature d'email) : chaque mention cohérente renforce la position.

## Limites gratuites

Netlify facture désormais à **crédits** : le plan gratuit donne **300 crédits par mois** et le site est mis en pause (sans facturation) s'ils sont épuisés. Fonctions, Blobs et Image CDN sont inclus. Vérifiez les chiffres à jour sur [netlify.com/pricing](https://www.netlify.com/pricing/). Turnstile est gratuit et illimité.

## Contenus à compléter

Marqués « À AJOUTER » sur le site, modifiables depuis l'admin :

- Vidéo YouTube de la soutenance.
- Diplôme de Licence (après la soutenance).
- Liens de vérification Cisco et Great Learning.
- Captures de VISION : ce sont des **écrans recréés à partir du code** avec des données de démonstration (sources dans `tools/screens/`).

---

© 2026 SOEDJE Kokou Ariel Caesar · contact : soedjekokouarielcaesar@gmail.com · +228 97 84 88 80
