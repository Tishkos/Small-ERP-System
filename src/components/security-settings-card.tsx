'use client';

/** Password change card for the Settings page. */

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { IconLock } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChangePasswordForm } from '@/components/change-password-form';

export function SecuritySettingsCard() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ku';
  const t = useTranslations('settings.security');

  const fontClass = locale === 'ku' ? 'font-kurdish' : 'font-engar';

  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn('flex items-center gap-2', fontClass)}>
          <IconLock className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription className={fontClass}>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChangePasswordForm />
      </CardContent>
    </Card>
  );
}
