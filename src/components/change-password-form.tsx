'use client';

/**
 * Change password form
 *
 * Shared by the Settings card and the forced first-login dialog. Requires the
 * current password, so a hijacked session cannot lock out the real owner.
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export const MIN_PASSWORD_LENGTH = 8;

export interface ChangePasswordFormProps {
  /** Called after the password has been changed successfully. */
  onSuccess?: () => void;
  /** Rendered next to the submit button (e.g. a Cancel action). */
  secondaryAction?: React.ReactNode;
  className?: string;
}

export function ChangePasswordForm({
  onSuccess,
  secondaryAction,
  className,
}: ChangePasswordFormProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'ku';
  const t = useTranslations('settings.security');
  const { update } = useSession();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fontClass = locale === 'ku' ? 'font-kurdish' : 'font-engar';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t('tooShort', { length: MIN_PASSWORD_LENGTH }));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('mismatch'));
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || t('failed'));
        setIsSaving(false);
        return;
      }

      // Retire the "you must change your password" state without signing out.
      await update({ mustChangePassword: false });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      console.error('Failed to change password:', err);
      setError(t('failed'));
    } finally {
      setIsSaving(false);
    }
  };

  const toggle = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setShowPasswords((visible) => !visible)}
      className={cn('text-muted-foreground h-auto px-2 py-1 text-xs', fontClass)}
    >
      {showPasswords ? (
        <>
          <EyeOff className="size-3.5" />
          {t('hide')}
        </>
      ) : (
        <>
          <Eye className="size-3.5" />
          {t('show')}
        </>
      )}
    </Button>
  );

  return (
    <form onSubmit={onSubmit} className={cn('space-y-5', className)}>
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

      {success && (
        <div
          role="status"
          className={cn(
            'rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400',
            fontClass
          )}
        >
          {t('changed')}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label htmlFor="currentPassword" className={fontClass}>
          {t('currentPassword')}
        </Label>
        {toggle}
      </div>
      <Input
        id="currentPassword"
        type={showPasswords ? 'text' : 'password'}
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        autoComplete="current-password"
        dir="ltr"
        required
        className="h-12 max-w-md text-base"
      />

      <div className="grid gap-5 sm:max-w-2xl sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newPassword" className={fontClass}>
            {t('newPassword')}
          </Label>
          <Input
            id="newPassword"
            type={showPasswords ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            dir="ltr"
            required
            className="h-12 text-base"
          />
          <p className={cn('text-muted-foreground text-xs', fontClass)}>
            {t('tooShort', { length: MIN_PASSWORD_LENGTH })}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmNewPassword" className={fontClass}>
            {t('confirmPassword')}
          </Label>
          <Input
            id="confirmNewPassword"
            type={showPasswords ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            dir="ltr"
            required
            className="h-12 text-base"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Button
          type="submit"
          disabled={isSaving}
          className={cn('w-full sm:w-auto', fontClass)}
        >
          {isSaving ? (
            <>
              <Spinner className="size-4" />
              {t('saving')}
            </>
          ) : (
            t('save')
          )}
        </Button>
        {secondaryAction}
      </div>
    </form>
  );
}
