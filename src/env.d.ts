/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    session?: import('./lib/auth').Session;
  }
}

interface ImportMetaEnv {
  readonly ADMIN_USERNAME?: string;
  readonly ADMIN_PASSWORD_HASH?: string;
  readonly PASETO_LOCAL_KEY?: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
  readonly TURNSTILE_SECRET_KEY?: string;
  readonly GITHUB_USERNAME?: string;
  readonly GITHUB_TOKEN?: string;
  readonly SITE_URL?: string;
}
