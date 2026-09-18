/**
 * Authentication Utilities
 * Auth helpers and session management
 * NextAuth v4 configuration (STABLE - Production Ready)
 *
 * Sign-in is username-or-email + password. There is no email verification step:
 * accounts are created during setup or by an administrator.
 *
 * The previous `otp` credentials provider authorized on an email address alone
 * while only *documenting* that a code had been verified. Nothing enforced it,
 * so posting an address straight to the NextAuth callback returned a valid
 * session for any account. It has been removed rather than patched.
 */

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './db';
import bcrypt from 'bcryptjs';
import { SESSION_COOKIE_NAME, useSecureCookies } from './auth-cookies';

/** Failed attempts tolerated before an account is temporarily locked. */
const MAX_LOGIN_ATTEMPTS = 5;

/**
 * A real bcrypt hash (of a throwaway string) compared against when no user
 * matches, so an unknown identifier costs the same time as a wrong password.
 * It must be a well-formed hash: bcrypt short-circuits on malformed input and
 * would return instantly, reintroducing the timing difference.
 */
const TIMING_EQUALISER_HASH =
  '$2a$12$pJsaLQxL2oXod0Okr8XUo.pHiilelEy2bxBGpMU3BklEt/hJFFfSK';

/** How long an account stays locked once the budget is exhausted. */
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Error messages surfaced to the sign-in form. Wrong identifier and wrong
 * password deliberately share one message so the form cannot be used to
 * enumerate which accounts exist.
 */
export const AUTH_ERRORS = {
  invalidCredentials: 'Invalid username or password',
  notActive: 'Account is not active. Please contact an administrator.',
  locked: 'Too many failed attempts. Try again in a few minutes.',
} as const;

/**
 * Resolve a login identifier to a user. Accepts either the username or the
 * email address, so a short name like "admin" works alongside full addresses.
 */
async function findUserByIdentifier(identifier: string) {
  const normalized = identifier.trim().toLowerCase();

  if (!normalized) return null;

  return prisma.user.findFirst({
    where: {
      OR: [{ email: normalized }, { username: normalized }],
    },
  });
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Username or email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          throw new Error(AUTH_ERRORS.invalidCredentials);
        }

        const user = await findUserByIdentifier(credentials.identifier as string);

        if (!user) {
          // Still pay the cost of a hash comparison so a missing account is not
          // distinguishable from a wrong password by response time alone.
          await bcrypt.compare(credentials.password as string, TIMING_EQUALISER_HASH);
          throw new Error(AUTH_ERRORS.invalidCredentials);
        }

        // Temporary lockout after repeated failures
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error(AUTH_ERRORS.locked);
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          const attempts = user.failedLoginAttempts + 1;
          const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS;

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: shouldLock ? 0 : attempts,
              lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MS) : null,
            },
          });

          throw new Error(
            shouldLock ? AUTH_ERRORS.locked : AUTH_ERRORS.invalidCredentials
          );
        }

        // Status is checked only after the password is proven correct, so the
        // form cannot be used to discover which addresses are registered.
        if (user.status !== 'ACTIVE') {
          throw new Error(AUTH_ERRORS.notActive);
        }

        // Successful sign-in clears the failure counter
        if (user.failedLoginAttempts !== 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockedUntil: null },
          });
        }

        // Get user permissions
        const employee = await prisma.employee.findUnique({
          where: { userId: user.id },
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        const permissions = employee?.roles.flatMap((er) =>
          er.role.permissions.map((rp) => rp.permission.name)
        ) || [];

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = (user as any).name;
        token.email = (user as any).email;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions || [];
        token.mustChangePassword = (user as any).mustChangePassword ?? false;
      }

      // Lets the client clear the "change your password" state via
      // useSession().update() right after a successful change, without
      // forcing a sign-out.
      if (trigger === 'update' && session?.mustChangePassword === false) {
        token.mustChangePassword = false;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).name = token.name;
        (session.user as any).role = token.role;
        (session.user as any).permissions = token.permissions;
        (session.user as any).mustChangePassword = token.mustChangePassword ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 6 * 60 * 60, // 6 hours
  },
  secret: process.env.AUTH_SECRET,
  // Debug disabled for production-ready setup
  debug: false,
  // Enhanced cookie security. Derived from the URL scheme, not NODE_ENV: see
  // src/lib/auth-cookies.ts for why that distinction matters.
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
  },
  useSecureCookies,
};

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12); // Increased from 10 to 12 for better security
}

/**
 * Verify password
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
