/**
 * Next.js Middleware
 * Handles i18n routing and authentication
 * MAXIMUM SECURITY: All routes protected except login/signup/forgot-password
 *
 * IMPORTANT: This file MUST be in the root directory (not src/) for Next.js to recognize it
 */

import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { config as appConfig } from '@/lib/config';
import { SESSION_COOKIE_NAME, useSecureCookies } from '@/lib/auth-cookies';

const LOCALES = appConfig.i18n.locales;
const DEFAULT_LOCALE = appConfig.i18n.defaultLocale;

// Create i18n middleware
const intlMiddleware = createMiddleware({
  locales: [...LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
});

// ONLY these routes are public (no authentication required).
// `/setup` is the one-time first-run wizard; it has to be reachable before any
// account exists, and the page itself redirects away once one does.
const publicRoutes = ['/login', '/signup', '/forgot-password', '/setup'];

// Built from the configured locales so the two cannot drift apart.
const LOCALE_PREFIX_PATTERN = new RegExp(`^/(${LOCALES.join('|')})(/|$)`);
const LOCALE_CAPTURE_PATTERN = new RegExp(`^/(${LOCALES.join('|')})`);

/**
 * Extensions served as static assets. Matching on a concrete list instead of
 * "contains a dot" keeps paths like `/ku/products/some.name` behind the auth
 * check rather than letting them skip the middleware entirely.
 */
const STATIC_FILE_PATTERN =
  /\.(?:ico|png|jpe?g|gif|webp|avif|svg|css|js|map|txt|xml|json|woff2?|ttf|otf|eot|pdf)$/i;

function resolveSecret(): string | undefined {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
}

/**
 * Read the session token. The cookie name is passed explicitly: getToken would
 * otherwise guess it from the URL scheme and disagree with the name NextAuth
 * actually wrote, bouncing signed-in users back to the sign-in page.
 */
function readToken(request: NextRequest) {
  return getToken({
    req: request,
    secret: resolveSecret(),
    cookieName: SESSION_COOKIE_NAME,
    secureCookie: useSecureCookies,
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    STATIC_FILE_PATTERN.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Extract locale from pathname first
  if (!LOCALE_PREFIX_PATTERN.test(pathname)) {
    // Let next-intl middleware handle locale routing
    return intlMiddleware(request);
  }

  // Extract path without locale
  const pathWithoutLocale = pathname.replace(LOCALE_CAPTURE_PATTERN, '') || '/';
  const locale = pathname.match(LOCALE_CAPTURE_PATTERN)?.[1] || DEFAULT_LOCALE;

  // Check if this is a public route
  const isPublicRoute = publicRoutes.includes(pathWithoutLocale);

  const redirectToLogin = () => {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  };

  // SECURITY: Protect ALL routes except public ones
  // This includes: /dashboard, /products, /motorcycles, /sales, /invoices, /customers, /employees, etc.
  if (!isPublicRoute) {
    try {
      const token = await readToken(request);

      if (!token) {
        // No token found - redirect to login
        return redirectToLogin();
      }

      // Token exists - user is authenticated, allow access
    } catch (error) {
      // If auth check fails, redirect to login (security first)
      console.error('[Middleware] Auth check failed:', error);
      return redirectToLogin();
    }
  }

  // Redirect authenticated users away from auth pages (UX improvement).
  // /setup is excluded: it performs its own (server-side) redirect once the
  // installation has an account, and bouncing it here would hide that.
  if (isPublicRoute && pathWithoutLocale !== '/setup') {
    try {
      const token = await readToken(request);

      if (token) {
        // User is authenticated, redirect to dashboard
        return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
      }
    } catch {
      // If auth check fails, allow access to public route (allow login/signup)
      // Silent fail for public routes
    }
  }

  // Let next-intl middleware handle the rest
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all routes except API, static files, and Next.js internals
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
