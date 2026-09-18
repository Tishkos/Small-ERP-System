/**
 * Signup Page
 * Request an account, which an administrator then activates.
 *
 * On a brand new installation this redirects to the setup wizard instead, so the
 * very first account is always created together with the company name and logo.
 */

import { redirect } from 'next/navigation';
import { isAppInitialized } from '@/lib/company';
import { CompanyLogo } from '@/components/company-logo';
import { SignupForm } from '@/components/signup-form';

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!(await isAppInitialized())) {
    redirect(`/${locale}/setup`);
  }

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="flex w-full max-w-xl flex-col gap-6">
        <div className="flex justify-center">
          <CompanyLogo size="lg" />
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
