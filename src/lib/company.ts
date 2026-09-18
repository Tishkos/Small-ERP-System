/**
 * Company settings (server-side)
 *
 * The installation's own name and logo live in a single database row rather than
 * in environment variables, so an administrator can rebrand from the Settings
 * page without a redeploy. The product name used to be hardcoded as "Arbati"
 * across the sidebar, the sign-in screen and every printed document.
 */

import { prisma } from './db';

/** The single company_settings row. */
export const COMPANY_SETTINGS_ID = 'default';

/** Shown until an administrator sets a real company name. */
export const DEFAULT_COMPANY_NAME = 'My Company';

export interface CompanyBranding {
  name: string;
  logo: string | null;
}

/**
 * Read the company branding.
 *
 * Never throws: the sign-in screen and the root layout render before setup has
 * run and, in a misconfigured deployment, before the database is reachable.
 * Branding is decoration, so a failure falls back to the default name instead
 * of taking the page down.
 */
export async function getCompanyBranding(): Promise<CompanyBranding> {
  try {
    const settings = await prisma.companySettings.findUnique({
      where: { id: COMPANY_SETTINGS_ID },
      select: { name: true, logo: true },
    });

    if (!settings) {
      return { name: DEFAULT_COMPANY_NAME, logo: null };
    }

    return {
      name: settings.name?.trim() || DEFAULT_COMPANY_NAME,
      logo: settings.logo || null,
    };
  } catch {
    return { name: DEFAULT_COMPANY_NAME, logo: null };
  }
}

/**
 * True once the installation has at least one user account, i.e. setup has
 * already been completed. Used to gate the one-time setup wizard.
 */
export async function isAppInitialized(): Promise<boolean> {
  const userCount = await prisma.user.count();
  return userCount > 0;
}
