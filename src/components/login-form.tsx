'use client';

/**
 * Sign-in form
 *
 * Username-or-email plus password. There is no email verification step: the
 * first administrator is created by the setup wizard, and further accounts by an
 * administrator.
 *
 * Failure messages come from the server and deliberately do not distinguish an
 * unknown account from a wrong password.
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signIn } from 'next-auth/react';
import { getTextDirection } from '@/lib/i18n';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CompanyLogo } from '@/components/company-logo';
import { useBranding } from '@/components/branding-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import 'flag-icons/css/flag-icons.min.css';

interface LoginFormProps extends React.ComponentProps<'div'> {
  className?: string;
}

export function LoginForm({ className, ...props }: LoginFormProps) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'ku';
  const t = useTranslations('auth');
  const tLang = useTranslations('language');
  const { name: companyName } = useBranding();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // A brand new installation has no accounts at all, so send the first visitor
  // to the setup wizard instead of a sign-in form nobody can pass.
  useEffect(() => {
    let cancelled = false;

    const checkSetup = async () => {
      try {
        const response = await fetch('/api/setup', { cache: 'no-store' });

        if (!response.ok) return;

        const data = await response.json();

        if (!cancelled && data?.initialized === false) {
          router.replace(`/${locale}/setup`);
        }
      } catch {
        // If the check fails, stay on the sign-in form.
      }
    };

    checkSetup();

    return () => {
      cancelled = true;
    };
  }, [locale, router]);

  const handleLocaleChange = (newLocale: string) => {
    const pathWithoutLocale = pathname.replace(/^\/(ku|en|ar)/, '') || '/login';
    router.push(`/${newLocale}${pathWithoutLocale}`);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError(t('missingCredentials'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        identifier: identifier.trim(),
        password,
        redirect: false,
      });

      if (!result?.ok) {
        // NextAuth forwards the provider's thrown message here.
        setError(result?.error || t('invalidCredentials'));
        setIsLoading(false);
        return;
      }

      const callbackUrl = searchParams.get('callbackUrl');
      router.push(callbackUrl || `/${locale}/dashboard`);
    } catch (err) {
      console.error('Error signing in:', err);
      setError(t('signInFailed'));
      setIsLoading(false);
    }
  };

  const fontClass = locale === 'ku' ? 'font-kurdish' : 'font-engar';
  const direction = getTextDirection(locale as 'ku' | 'en' | 'ar');

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      {/* Language Dropdown */}
      <div className={cn('flex', direction === 'rtl' ? 'justify-start' : 'justify-end')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={fontClass}>
              {tLang('label')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={cn('w-56', fontClass)}
            style={{ direction } as React.CSSProperties}
          >
            <DropdownMenuLabel>{tLang('title')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={locale} onValueChange={handleLocaleChange}>
              <DropdownMenuRadioItem value="ku" className="font-kurdish">
                <div className="flex items-center gap-2">
                  <span className="fi fi-tj"></span>
                  <span>{tLang('kurdish')}</span>
                </div>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="ar" className="font-engar">
                <div className="flex items-center gap-2">
                  <span className="fi fi-iq"></span>
                  <span>{tLang('arabic')}</span>
                </div>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en" className="font-engar">
                <div className="flex items-center gap-2">
                  <span className="fi fi-gb"></span>
                  <span>{tLang('english')}</span>
                </div>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <form onSubmit={onSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-3 text-center">
            <CompanyLogo size="lg" />
            <div className="space-y-1">
              <h1 className={cn('text-xl font-bold', fontClass)}>{companyName}</h1>
              <p className={cn('text-muted-foreground text-sm', fontClass)}>
                {t('welcome')}
              </p>
            </div>
          </div>

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

          <Field>
            <FieldLabel htmlFor="identifier" className={fontClass}>
              {t('identifier')}
            </FieldLabel>
            <Input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              dir="ltr"
              placeholder={t('identifierPlaceholder')}
              required
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (error) setError(null);
              }}
              disabled={isLoading}
              className="h-12 text-base"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="password" className={fontClass}>
              {t('password')}
            </FieldLabel>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                dir="ltr"
                placeholder={t('passwordPlaceholder')}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isLoading}
                className={cn('h-12 text-base', direction === 'rtl' ? 'pl-11' : 'pr-11')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                tabIndex={-1}
                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                onClick={() => setShowPassword((visible) => !visible)}
                className={cn(
                  'text-muted-foreground absolute top-1/2 size-8 -translate-y-1/2',
                  direction === 'rtl' ? 'left-2' : 'right-2'
                )}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
          </Field>

          <Field>
            <Button
              type="submit"
              className={cn('h-12 w-full text-base', fontClass)}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="size-4" />
                  {t('signingIn')}
                </>
              ) : (
                t('login')
              )}
            </Button>
          </Field>

          <FieldDescription className={cn('text-center text-xs', fontClass)}>
            {t('forgotPasswordHint')}
          </FieldDescription>
        </FieldGroup>
      </form>
    </div>
  );
}
