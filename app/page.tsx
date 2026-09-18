import { redirect } from 'next/navigation';
import { config } from '@/lib/config';

export default function HomePage() {
  // Redirect to login for security - middleware will handle authenticated
  // redirects. Uses the configured default locale rather than a hardcoded 'ku',
  // which would ignore DEFAULT_LOCALE.
  redirect(`/${config.i18n.defaultLocale}/login`);
}
