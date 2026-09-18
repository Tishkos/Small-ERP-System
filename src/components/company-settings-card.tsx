'use client';

/**
 * Company branding settings
 *
 * Lets an administrator rename the company and replace its logo after setup.
 * Rendered only for administrators; /api/company also enforces the role, so
 * hiding the card is presentation, not the access control.
 */

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { IconBuildingStore, IconUpload, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
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
import { useObjectUrl } from '@/hooks/use-object-url';
import { useBranding } from '@/components/branding-provider';
import { useToast } from '@/components/ui/use-toast';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function CompanySettingsCard() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ku';
  const t = useTranslations('settings.company');
  const { toast } = useToast();
  const branding = useBranding();

  const [name, setName] = useState(branding.name);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const { url: logoPreview, setFile: setLogoPreviewFile } = useObjectUrl();
  const [removeLogo, setRemoveLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fontClass = locale === 'ku' ? 'font-kurdish' : 'font-engar';

  // Keep the field in step with branding loaded or refreshed elsewhere.
  useEffect(() => {
    setName(branding.name);
  }, [branding.name]);

  const chooseLogo = (file: File | null) => {
    if (!file) {
      setLogoFile(null);
      setLogoPreviewFile(null);
      return;
    }

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast({ title: t('logoTypeError'), variant: 'destructive' });
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      toast({ title: t('logoSizeError'), variant: 'destructive' });
      return;
    }

    setRemoveLogo(false);
    setLogoFile(file);
    setLogoPreviewFile(file);
  };

  const hasChanges =
    name.trim() !== branding.name || logoFile !== null || removeLogo;

  const onSave = async () => {
    if (!name.trim()) {
      toast({ title: t('nameRequired'), variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());

      if (logoFile) {
        formData.append('logo', logoFile);
      } else if (removeLogo) {
        formData.append('removeLogo', 'true');
      }

      const response = await fetch('/api/company', {
        method: 'PATCH',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: data?.error || t('saveFailed'),
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      branding.setBranding({
        name: data.company.name,
        logo: data.company.logo ?? null,
      });
      setLogoFile(null);
      setLogoPreviewFile(null);
      setRemoveLogo(false);

      toast({ title: t('saved') });
    } catch (error) {
      console.error('Failed to save company branding:', error);
      toast({ title: t('saveFailed'), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // What the sidebar and sign-in screen will show once saved.
  const previewLogo = logoFile ? logoPreview : removeLogo ? null : branding.logo;

  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn('flex items-center gap-2', fontClass)}>
          <IconBuildingStore className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription className={fontClass}>{t('description')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="company-name" className={fontClass}>
            {t('nameLabel')}
          </Label>
          <Input
            id="company-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="h-12 max-w-md text-base"
          />
          <p className={cn('text-muted-foreground text-xs', fontClass)}>
            {t('nameHint')}
          </p>
        </div>

        <div className="space-y-3">
          <Label className={fontClass}>{t('logoLabel')}</Label>

          <div className="flex items-center gap-4">
            <CompanyLogo
              size="xl"
              name={name || branding.name}
              logo={previewLogo}
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
                  {previewLogo ? t('logoChange') : t('logoChoose')}
                </Button>

                {previewLogo && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreviewFile(null);
                      setRemoveLogo(true);
                    }}
                    className={cn('text-muted-foreground', fontClass)}
                  >
                    <IconX className="size-4" />
                    {t('logoRemove')}
                  </Button>
                )}
              </div>

              <p className={cn('text-muted-foreground text-xs', fontClass)}>
                {logoFile ? logoFile.name : t('logoHint')}
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_LOGO_TYPES.join(',')}
            className="hidden"
            onChange={(e) => chooseLogo(e.target.files?.[0] ?? null)}
          />
        </div>
      </CardContent>

      <CardFooter>
        <Button
          onClick={onSave}
          disabled={isSaving || !hasChanges}
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
      </CardFooter>
    </Card>
  );
}
