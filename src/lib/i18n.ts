/**
 * i18n helpers
 *
 * Client-safe only. The next-intl request configuration lives in
 * `src/i18n/request.ts` (the path registered in `next.config.ts`); this module
 * previously exported a second, unused `getRequestConfig` which dragged
 * `next-intl/server` and `next/navigation` into every client component that
 * only wanted `getTextDirection`.
 */

import { config } from './config';

// Supported locales
export const locales = config.i18n.locales;
export type Locale = (typeof locales)[number];

/**
 * Get text direction for locale
 */
export function getTextDirection(locale: Locale): 'ltr' | 'rtl' {
  // Kurdish and Arabic both use RTL
  return locale === 'ar' || locale === 'ku' ? 'rtl' : 'ltr';
}

/**
 * Get locale from URL or default
 */
export function getLocale(locale?: string): Locale {
  if (locale && locales.includes(locale as Locale)) {
    return locale as Locale;
  }
  return config.i18n.defaultLocale as Locale;
}
