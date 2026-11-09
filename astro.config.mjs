// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';

export default defineConfig({
  site: process.env.SITE_URL || 'https://kokoudev.netlify.app',
  output: 'server',
  adapter: netlify({ imageCDN: true }),
  integrations: [react()],
  build: { inlineStylesheets: 'always' },

  // Variables d'environnement typées. Les secrets ("secret") sont lus à l'exécution
  // et ne sont JAMAIS copiés dans le code compilé.
  env: {
    schema: {
      ADMIN_USERNAME: envField.string({ context: 'server', access: 'secret', optional: true }),
      ADMIN_PASSWORD_HASH: envField.string({ context: 'server', access: 'secret', optional: true }),
      PASETO_LOCAL_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      IP_HASH_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      GITHUB_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      GITHUB_USERNAME: envField.string({ context: 'server', access: 'public', default: 'kokoudev' }),
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_BING_SITE_VERIFICATION: envField.string({ context: 'client', access: 'public', optional: true }),
    },
    validateSecrets: false,
  },

  security: {
    checkOrigin: true,
    // CSP stricte : Astro calcule une empreinte (hash) pour chaque script et style qu'il émet.
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https://i.ytimg.com",
        "font-src 'self'",
        "connect-src 'self' https://challenges.cloudflare.com",
        "frame-src https://www.youtube-nocookie.com https://challenges.cloudflare.com",
        "media-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        "manifest-src 'self'",
        "worker-src 'self'",
      ],
      scriptDirective: {
        resources: ["'self'", 'https://challenges.cloudflare.com'],
      },
    },
  },
  vite: {
    build: { assetsInlineLimit: 0 },
  },
});
