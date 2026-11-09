// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';

export default defineConfig({
  site: process.env.SITE_URL || 'https://soedje-portfolio.netlify.app',
  output: 'server',
  adapter: netlify({ imageCDN: true }),
  integrations: [react()],
  build: { inlineStylesheets: 'always' },
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
