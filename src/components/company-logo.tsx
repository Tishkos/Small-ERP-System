'use client';

/**
 * Company logo
 *
 * Renders the uploaded logo when there is one, otherwise a monogram built from
 * the company initials. The monogram means an installation always looks
 * finished — there is no broken-image state before someone uploads a file, and
 * no leftover placeholder brand.
 *
 * Uploaded logos are shown as-is. The old hardcoded logo was rendered with
 * `dark:brightness-0 dark:invert` to force it white in dark mode; doing that to
 * an arbitrary customer logo would wreck its colours, so the mark sits on a
 * neutral rounded container that reads correctly in both themes instead.
 */

import { cn } from '@/lib/utils';
import { getServeUrl } from '@/lib/serve-url';
import { useBranding } from '@/components/branding-provider';

type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<LogoSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-20 text-2xl',
};

/** Up to two initials, e.g. "Zagros Trading" -> "ZT". */
export function companyInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) return '?';

  // A single word contributes its first two characters so the mark is not a
  // lone letter floating in a large tile.
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return words.map((word) => word[0]).join('').toUpperCase();
}

export interface CompanyLogoProps {
  /** Override the branding from context (used by the setup wizard preview). */
  name?: string;
  logo?: string | null;
  size?: LogoSize;
  className?: string;
}

export function CompanyLogo({
  name,
  logo,
  size = 'md',
  className,
}: CompanyLogoProps) {
  const branding = useBranding();
  const companyName = name ?? branding.name;
  const logoPath = logo !== undefined ? logo : branding.logo;
  const resolved = getServeUrl(logoPath);

  if (resolved) {
    return (
      <span
        className={cn(
          'bg-muted flex shrink-0 items-center justify-center overflow-hidden rounded-md',
          SIZE_CLASSES[size],
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded
            file served through /api/serve, which next/image cannot optimize */}
        <img
          src={resolved}
          alt={companyName}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-primary text-primary-foreground flex shrink-0 items-center justify-center rounded-md font-semibold tracking-tight',
        SIZE_CLASSES[size],
        className
      )}
    >
      {companyInitials(companyName)}
    </span>
  );
}

/** Logo plus the company name, as used in the sidebar header. */
export function CompanyLogoWithName({
  size = 'sm',
  className,
  nameClassName,
}: {
  size?: LogoSize;
  className?: string;
  nameClassName?: string;
}) {
  const { name } = useBranding();

  return (
    <span className={cn('flex items-center gap-2', className)}>
      <CompanyLogo size={size} />
      <span className={cn('truncate text-base font-semibold', nameClassName)}>
        {name}
      </span>
    </span>
  );
}
