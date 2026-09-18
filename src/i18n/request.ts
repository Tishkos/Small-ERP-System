import { getRequestConfig } from 'next-intl/server';
import { config } from '@/lib/config';
import type { Locale } from '@/lib/i18n';

export default getRequestConfig(async ({ locale }) => {
  // Fall back to the default locale rather than 404ing, so an unknown prefix
  // still renders a usable page.
  const resolvedLocale: Locale =
    locale && config.i18n.locales.includes(locale as Locale)
      ? (locale as Locale)
      : (config.i18n.defaultLocale as Locale);

  return {
    locale: resolvedLocale,
    messages: (await import(`../../messages/${resolvedLocale}.json`)).default,
  };
});
