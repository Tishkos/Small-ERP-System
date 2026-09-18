/**
 * Locale Layout
 * Handles i18n for each locale
 * NOTE: DO NOT include <html> or <body> here - that's in root app/layout.tsx
 * DO NOT import globals.css here - that's in root app/layout.tsx
 * 
 * This layout is REQUIRED for next-intl to work with [locale] routes
 */

import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { getTextDirection } from '@/lib/i18n';
import { notFound } from 'next/navigation';
import { config } from '@/lib/config';
import { getCompanyBranding } from '@/lib/company';
import { BrandingProvider } from '@/components/branding-provider';

// Resolved per request so the browser tab carries the company name chosen
// during setup instead of a hardcoded brand.
export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getCompanyBranding();

  return { title: `${name} ERP` };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>; // Next.js 16: params IS a Promise
}) {
  const { locale } = await params; // Must await in Next.js 16
  
  // Validate locale
  if (!config.i18n.locales.includes(locale as any)) {
    notFound();
  }
  
  const direction = getTextDirection(locale as 'ku' | 'en' | 'ar');
  
  // Get messages for this locale
  const messages = await getMessages({ locale });

  // Company name and logo, read once here and shared with the whole client
  // tree so the sidebar, sign-in screen and printed documents agree.
  const branding = await getCompanyBranding();

  // Set font class based on locale
  const fontClass = locale === 'ku' ? 'font-kurdish' : 'font-engar';

  return (
    <div dir={direction} lang={locale} className={fontClass} suppressHydrationWarning>
      <NextIntlClientProvider messages={messages}>
        <BrandingProvider value={branding}>{children}</BrandingProvider>
      </NextIntlClientProvider>
    </div>
  );
}

