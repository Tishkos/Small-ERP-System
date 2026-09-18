/**
 * Forgot Password Page
 *
 * Sign-in is password-only and the product sends no verification email, so there
 * is no self-service reset to offer. This page previously faked one: it waited
 * 1.5 seconds and then claimed "Email Sent!" without contacting anything, which
 * left people waiting for a message that was never coming. It now says plainly
 * that an administrator has to reset the password.
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTextDirection } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CompanyLogo } from '@/components/company-logo';
import { useBranding } from '@/components/branding-provider';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'ku';
  const { name: companyName } = useBranding();

  const fontClass = locale === 'ku' ? 'font-kurdish' : 'font-engar';
  const direction = getTextDirection(locale as 'ku' | 'en' | 'ar');
  const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <CompanyLogo size="lg" />
          <h1 className={cn('text-xl font-bold', fontClass)}>{companyName}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className={cn('flex items-center gap-2', fontClass)}>
              <KeyRound className="size-5" />
              Password help
            </CardTitle>
            <CardDescription className={fontClass}>
              Passwords are managed inside your organisation.
            </CardDescription>
          </CardHeader>

          <CardContent className={cn('text-muted-foreground space-y-3 text-sm', fontClass)}>
            <p>
              This system does not send password reset emails. Ask an
              administrator to set a new password for your account, then sign in
              with it and change it from <strong>Settings</strong>.
            </p>
            <p>
              If you can still sign in, you can change your own password at any
              time from <strong>Settings</strong>.
            </p>
          </CardContent>

          <CardFooter>
            <Button
              variant="outline"
              onClick={() => router.push(`/${locale}/login`)}
              className={cn('w-full', fontClass)}
            >
              <BackIcon className="size-4" />
              Back to sign in
            </Button>
          </CardFooter>
        </Card>

        <p className={cn('text-muted-foreground text-center text-xs', fontClass)}>
          <Link href={`/${locale}/login`} className="hover:underline">
            {companyName}
          </Link>
        </p>
      </div>
    </div>
  );
}
