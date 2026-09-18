/**
 * Session cookie naming
 *
 * Kept in its own module with no heavy imports because the middleware (edge
 * runtime) needs it and must not pull in Prisma or bcrypt via `@/lib/auth`.
 *
 * Why this exists: the cookie used to be named from NODE_ENV
 * (`__Secure-next-auth.session-token` whenever NODE_ENV === 'production') while
 * the middleware read it with `getToken()`, which infers the name from whether
 * the URL is https. Any production deployment served over plain http therefore
 * had NextAuth writing `__Secure-...` while the middleware looked for the
 * unprefixed name, so every authenticated request was redirected straight back
 * to the sign-in page. Browsers also refuse `__Secure-` cookies over http, so
 * the session was never stored in the first place.
 *
 * Both sides now derive the name from the same signal: the scheme of the
 * configured public URL. https deployments still get `__Secure-` and
 * `secure: true`; http deployments get a cookie that actually works.
 */

function publicUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '';
}

/** True only when the app is actually served over https. */
export const useSecureCookies = publicUrl().startsWith('https://');

/** Cookie NextAuth writes the session JWT to, and the middleware reads. */
export const SESSION_COOKIE_NAME = `${
  useSecureCookies ? '__Secure-' : ''
}next-auth.session-token`;
