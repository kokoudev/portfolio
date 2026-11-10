import { defineMiddleware } from 'astro:middleware';
import { readSession, safeEqual } from './lib/auth';
import { json, sameOrigin } from './lib/security';

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/admin/login/', '/api/admin/login']);

export const onRequest = defineMiddleware(async (ctx, next) => {
  const path = ctx.url.pathname;
  const isAdmin = path === '/admin' || path.startsWith('/admin/') || path.startsWith('/api/admin/');
  // Toutes les réponses (y compris les refus 401/403 et les redirections) reçoivent les en-têtes.
  return withSecurityHeaders(await guard(ctx, next), ctx.url, isAdmin);
});

type Ctx = Parameters<Parameters<typeof defineMiddleware>[0]>[0];
type Next = Parameters<Parameters<typeof defineMiddleware>[0]>[1];

async function guard(ctx: Ctx, next: Next): Promise<Response> {
  const { url, request, cookies } = ctx;
  const path = url.pathname;
  const isAdminPage = path === '/admin' || path.startsWith('/admin/');
  const isAdminApi = path.startsWith('/api/admin/');

  if ((isAdminPage || isAdminApi) && !PUBLIC_ADMIN_PATHS.has(path)) {
    const session = await readSession(cookies);
    if (!session) {
      if (isAdminApi) return json({ error: 'Non authentifié' }, 401);
      return ctx.redirect('/admin/login', 303);
    }
    ctx.locals.session = session;

    // Toute écriture : même origine + jeton CSRF lié à la session
    if (isAdminApi && request.method !== 'GET' && request.method !== 'HEAD') {
      if (!sameOrigin(request, url)) return json({ error: 'Origine refusée' }, 403);
      const csrf = request.headers.get('x-csrf-token');
      if (!csrf || !safeEqual(csrf, session.csrf)) return json({ error: 'Jeton CSRF invalide' }, 403);
    }
  }

  if (isAdminApi && path === '/api/admin/login' && request.method === 'POST' && !sameOrigin(request, url)) {
    return json({ error: 'Origine refusée' }, 403);
  }

  return next();
}

/** En-têtes de sécurité sur toutes les réponses dynamiques. */
function withSecurityHeaders(response: Response, url: URL, isAdmin: boolean): Response {
  // Les réponses de redirection d'Astro peuvent avoir des en-têtes immuables : on les recopie.
  try {
    response.headers.set('X-Content-Type-Options', 'nosniff');
  } catch {
    response = new Response(response.body, response);
  }
  const h = response.headers;
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'DENY');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  if (url.protocol === 'https:') h.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  if (!h.has('Content-Security-Policy')) h.set('Content-Security-Policy', "frame-ancestors 'none'");
  if (isAdmin) {
    h.set('Cache-Control', 'no-store');
    h.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}
