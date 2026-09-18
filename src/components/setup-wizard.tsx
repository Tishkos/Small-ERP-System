'use client';

/**
 * First-run setup wizard
 *
 * Two steps: name the company and pick its logo, then create the administrator
 * account. Runs once per installation — /api/setup refuses to create a second
 * first administrator.
 */

import { useRef, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { IconBuildingStore, IconCheck, IconUpload, IconUserShield, IconX } from '@tabler/icons-react';
import { Eye, EyeOff } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { CompanyLogo } from '@/components/company-logo';
import { useObjectUrl } from '@/hooks/use-object-url';
import 'flag-icons/css/flag-icons.min.css';

const MIN_PASSWORD_LENGTH = 8;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

type Step = 'company' | 'admin';

export function SetupWizard() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const locale = (params?.locale as string) || 'ku';
  const t = useTranslations('setup');
  const tLang = useTranslations('language');

  const [step, setStep] = useState<Step>('company');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [companyName, setCompanyName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const { url: logoPreview, setFile: setLogoPreviewFile } = useObjectUrl();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2
  const [adminName, setAdminName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fontClass = locale === 'ku' ? 'font-kurdish' : 'font-engar';
  const direction = getTextDirection(locale as 'ku' | 'en' | 'ar');

  const handleLocaleChange = (newLocale: string) => {
    const pathWithoutLocale = pathname.replace(/^\/(ku|en|ar)/, '') || '/setup';
    router.push(`/${newLocale}${pathWithoutLocale}`);
  };

  const handleLogoChange = (file: File | null) => {
    setError(null);

    if (!file) {
      setLogoFile(null);
      setLogoPreviewFile(null);
      return;
    }

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      setError(t('logoTypeError'));
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      setError(t('logoSizeError'));
      return;
    }

    setLogoFile(file);
    setLogoPreviewFile(file);
  };

  const goToAdminStep = () => {
    setError(null);

    if (!companyName.trim()) {
      setError(t('companyNameRequired'));
      return;
    }

    setStep('admin');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!adminName.trim()) {
      setError(t('adminNameRequired'));
      return;
    }

    if (!USERNAME_PATTERN.test(username.trim().toLowerCase())) {
      setError(t('usernameInvalid'));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t('emailInvalid'));
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('passwordTooShort', { length: MIN_PASSWORD_LENGTH }));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('companyName', companyName.trim());
      formData.append('adminName', adminName.trim());
      formData.append('username', username.trim().toLowerCase());
      formData.append('email', email.trim().toLowerCase());
      formData.append('password', password);

      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const response = await fetch('/api/setup', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || t('failed'));
        setIsSubmitting(false);
        return;
      }

      // Land on the sign-in screen, which now shows the new branding.
      router.replace(`/${locale}/login?setup=complete`);
    } catch (err) {
      console.error('Setup failed:', err);
      setError(t('failed'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6" style={{ direction } as React.CSSProperties}>
      {/* Language switcher, matching the sign-in screen */}
      <div className={cn('flex', direction === 'rtl' ? 'justify-start' : 'justify-end')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={fontClass}>
              {tLang('label')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className={cn('w-56', fontClass)}>
            <DropdownMenuLabel>{tLang('title')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={locale} onValueChange={handleLocaleChange}>
              <DropdownMenuRadioItem value="ku" className="font-kurdish">
                <div className="flex items-center gap-2">
                  <span className="fi fi-tj" />
                  <span>{tLang('kurdish')}</span>
                </div>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="ar" className="font-engar">
                <div className="flex items-center gap-2">
                  <span className="fi fi-iq" />
                  <span>{tLang('arabic')}</span>
                </div>
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en" className="font-engar">
                <div className="flex items-center gap-2">
                  <span className="fi fi-gb" />
                  <span>{tLang('english')}</span>
                </div>
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Step indicator */}
      <ol className="flex items-center justify-center gap-3" aria-label={t('progress')}>
        {(['company', 'admin'] as const).map((value, index) => {
          const isDone = step === 'admin' && value === 'company';
          const isCurrent = step === value;

          return (
            <li key={value} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                    isDone && 'bg-primary text-primary-foreground border-primary',
                    isCurrent && 'border-primary text-primary',
                    !isDone && !isCurrent && 'border-muted text-muted-foreground'
                  )}
                >
                  {isDone ? <IconCheck className="size-4" /> : index + 1}
                </span>
                <span
                  className={cn(
                    'hidden text-sm sm:inline',
                    fontClass,
                    isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}
                >
                  {value === 'company' ? t('steps.company') : t('steps.admin')}
                </span>
              </div>
              {index === 0 && <span className="bg-border h-px w-8" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle className={cn('flex items-center gap-2', fontClass)}>
            {step === 'company' ? (
              <IconBuildingStore className="size-5" />
            ) : (
              <IconUserShield className="size-5" />
            )}
            {step === 'company' ? t('company.title') : t('admin.title')}
          </CardTitle>
          <CardDescription className={fontClass}>
            {step === 'company' ? t('company.description') : t('admin.description')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div
              role="alert"
              className={cn(
                'border-destructive/30 bg-destructive/10 text-destructive mb-5 rounded-md border px-3 py-2 text-sm',
                fontClass
              )}
            >
              {error}
            </div>
          )}

          {step === 'company' ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="companyName" className={fontClass}>
                  {t('company.nameLabel')}
                </Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={t('company.namePlaceholder')}
                  maxLength={80}
                  autoFocus
                  className="h-12 text-base"
                />
                <p className={cn('text-muted-foreground text-xs', fontClass)}>
                  {t('company.nameHint')}
                </p>
              </div>

              <div className="space-y-3">
                <Label className={fontClass}>{t('company.logoLabel')}</Label>

                <div className="flex items-center gap-4">
                  {/* Live preview: the uploaded file, or the initials monogram
                      the app falls back to when no logo is chosen. */}
                  <CompanyLogo
                    size="xl"
                    name={companyName || t('company.namePlaceholder')}
                    logo={logoPreview}
                    className="border"
                  />

                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className={fontClass}
                      >
                        <IconUpload className="size-4" />
                        {logoFile ? t('company.logoChange') : t('company.logoChoose')}
                      </Button>

                      {logoFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleLogoChange(null)}
                          className={cn('text-muted-foreground', fontClass)}
                        >
                          <IconX className="size-4" />
                          {t('company.logoRemove')}
                        </Button>
                      )}
                    </div>

                    <p className={cn('text-muted-foreground text-xs', fontClass)}>
                      {logoFile ? logoFile.name : t('company.logoHint')}
                    </p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_LOGO_TYPES.join(',')}
                  className="hidden"
                  onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          ) : (
            <form id="setup-admin-form" onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="adminName" className={fontClass}>
                  {t('admin.nameLabel')}
                </Label>
                <Input
                  id="adminName"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder={t('admin.namePlaceholder')}
                  autoFocus
                  className="h-12 text-base"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username" className={fontClass}>
                    {t('admin.usernameLabel')}
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    dir="ltr"
                    className="h-12 text-base"
                  />
                  <p className={cn('text-muted-foreground text-xs', fontClass)}>
                    {t('admin.usernameHint')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className={fontClass}>
                    {t('admin.emailLabel')}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    dir="ltr"
                    className="h-12 text-base"
                  />
                  <p className={cn('text-muted-foreground text-xs', fontClass)}>
                    {t('admin.emailHint')}
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password" className={fontClass}>
                    {t('admin.passwordLabel')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
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
                      aria-label={showPassword ? t('hidePassword') : t('showPassword')}
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
                    {t('passwordTooShort', { length: MIN_PASSWORD_LENGTH })}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className={fontClass}>
                    {t('admin.confirmPasswordLabel')}
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    dir="ltr"
                    className="h-12 text-base"
                  />
                </div>
              </div>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {step === 'admin' ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setError(null);
                setStep('company');
              }}
              disabled={isSubmitting}
              className={cn('w-full sm:w-auto', fontClass)}
            >
              {t('back')}
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}

          {step === 'company' ? (
            <Button
              type="button"
              onClick={goToAdminStep}
              className={cn('w-full sm:w-auto', fontClass)}
            >
              {t('continue')}
            </Button>
          ) : (
            <Button
              type="submit"
              form="setup-admin-form"
              disabled={isSubmitting}
              className={cn('w-full sm:w-auto', fontClass)}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="size-4" />
                  {t('creating')}
                </>
              ) : (
                t('finish')
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
