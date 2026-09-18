'use client';

/**
 * Forced password change
 *
 * The installation ships with a well-known admin/admin account so it works out
 * of the box. That is only acceptable if the default cannot quietly stay in
 * place, so accounts flagged `mustChangePassword` get this dialog on every page
 * until they set a real password. It has no dismiss affordance.
 */

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { IconShieldLock } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChangePasswordForm } from '@/components/change-password-form';

export function ForcePasswordChangeDialog() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ku';
  const t = useTranslations('settings.security');
  const { data: session } = useSession();

  const mustChange = Boolean(
    (session?.user as { mustChangePassword?: boolean } | undefined)?.mustChangePassword
  );

  const fontClass = locale === 'ku' ? 'font-kurdish' : 'font-engar';

  if (!mustChange) return null;

  return (
    <Dialog open>
      <DialogContent
        // Not dismissible: closing it would leave the default password active.
        showCloseButton={false}
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        className="sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className={cn('flex items-center gap-2', fontClass)}>
            <IconShieldLock className="h-5 w-5" />
            {t('forcedTitle')}
          </DialogTitle>
          <DialogDescription className={fontClass}>
            {t('forcedDescription')}
          </DialogDescription>
        </DialogHeader>

        <ChangePasswordForm />
      </DialogContent>
    </Dialog>
  );
}
