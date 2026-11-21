/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    session?: import('./lib/auth').Session;
  }
}

// Les variables d'environnement sont déclarées dans astro.config.mjs (env.schema) et lues via astro:env.

/** Date du build (AAAA-MM-JJ), injectée par Vite (astro.config.mjs). */
declare const __BUILD_DATE__: string;
