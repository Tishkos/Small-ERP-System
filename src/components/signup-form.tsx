'use client';

/**
 * Request an account
 *
 * Creates a PENDING account that an administrator has to activate. It is not a
 * way in by itself, so no email verification is involved.
 *
 * Styled to match the sign-in and setup screens: the previous version used
 * hardcoded `bg-gray-50` / `text-gray-600`, which ignored dark mode, the locale
 * fonts and RTL entirely.
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconCircleCheck } from '@tabler/icons-react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTextDirection } from '@/lib/i18n';
import { signupAction } from '@/modules/auth/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { CompanyLogo } from '@/components/company-logo';
import { useBranding } from '@/components/branding-provider';

const MIN_PASSWORD_LENGTH = 8;
const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

export function SignupForm() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'ku';
  const { name: companyName } = useBranding();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fontClass = locale === 'ku' ? 'font-kurdish' : 'font-engar';
  const direction = getTextDirection(locale as 'ku' | 'en' | 'ar');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Enter your full name');
      return;
    }

    if (username && !USERNAME_PATTERN.test(username.trim().toLowerCase())) {
      setError(
        'Username must be 3-32 characters: lowercase letters, numbers, dots, dashes or underscores'
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    setIsLoading(true);

    try {
      const result = await signupAction({
        name: name.trim(),
        username: username.trim().toLowerCase() || undefined,
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
      });

      if (!result.success) {
        setError(result.error || 'An error occurred during signup');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error('Signup failed:', err);
      setError('An error occurred during signup');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className={cn('flex items-center gap-2', fontClass)}>
            <IconCircleCheck className="size-5 text-emerald-600 dark:text-emerald-500" />
            Request received
          </CardTitle>
          <CardDescription className={fontClass}>
            Your account has been created and is waiting for approval.
          </CardDescription>
        </CardHeader>
        <CardContent className={cn('text-muted-foreground text-sm', fontClass)}>
          An administrator at {companyName} has to activate your account before
          you can sign in. You will be able to use the username or email you
          just registered.
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => router.push(`/${locale}/login`)}
            className={cn('w-full sm:w-auto', fontClass)}
          >
            Go to sign in
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className={fontClass}>Request an account</CardTitle>
        <CardDescription className={fontClass}>
          An administrator at {companyName} will review and activate it.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form id="signup-form" onSubmit={onSubmit} className="space-y-5">
          {error && (
            <div
              role="alert"
              className={cn(
                'border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm',
                fontClass
              )}
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className={fontClass}>
              Full name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="h-12 text-base"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="signup-username" className={fontClass}>
                Username <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="signup-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                dir="ltr"
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email" className={fontClass}>
                Email
              </Label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                dir="ltr"
                className="h-12 text-base"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="signup-phone" className={fontClass}>
                Phone <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="signup-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                dir="ltr"
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password" className={fontClass}>
                Password
              </Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  dir="ltr"
                  className={cn('h-12 text-base', direction === 'rtl' ? 'pl-11' : 'pr-11')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className={cn(
                    'text-muted-foreground absolute top-1/2 size-8 -translate-y-1/2',
                    direction === 'rtl' ? 'left-2' : 'right-2'
                  )}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              <p className={cn('text-muted-foreground text-xs', fontClass)}>
                At least {MIN_PASSWORD_LENGTH} characters
              </p>
            </div>
          </div>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col items-stretch gap-4">
        <Button
          type="submit"
          form="signup-form"
          disabled={isLoading}
          className={cn('h-12 w-full text-base', fontClass)}
        >
          {isLoading ? (
            <>
              <Spinner className="size-4" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>

        <p className={cn('text-muted-foreground text-center text-sm', fontClass)}>
          Already have an account?{' '}
          <Link
            href={`/${locale}/login`}
            className="text-primary font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
