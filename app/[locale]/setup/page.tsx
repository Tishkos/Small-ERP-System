/**
 * First-run setup page
 *
 * Collects the company name and logo, then creates the first administrator.
 * Redirects away once the installation has any user account, so it cannot be
 * revisited to create a second "first" admin.
 */

import { redirect } from 'next/navigation';
import { isAppInitialized } from '@/lib/company';
import { SetupWizard } from '@/components/setup-wizard';

export default async function SetupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (await isAppInitialized()) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-2xl">
        <SetupWizard />
      </div>
    </div>
  );
}
