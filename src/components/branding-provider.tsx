'use client';

/**
 * Branding context
 *
 * The company name and logo are read once on the server and handed to the
 * client tree, so the sidebar, sign-in screen and printed documents all render
 * the same identity without each one fetching it. `refresh` lets the Settings
 * page update the whole app immediately after a rebrand.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface Branding {
  name: string;
  logo: string | null;
}

interface BrandingContextValue extends Branding {
  /** Apply new branding locally and re-read it from the server. */
  setBranding: (branding: Branding) => void;
  refresh: () => Promise<void>;
}

const FALLBACK: Branding = { name: 'My Company', logo: null };

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({
  value,
  children,
}: {
  value: Branding;
  children: ReactNode;
}) {
  const [branding, setBrandingState] = useState<Branding>(value);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/company', { cache: 'no-store' });

      if (!response.ok) return;

      const data = await response.json();

      if (data?.company?.name) {
        setBrandingState({
          name: data.company.name,
          logo: data.company.logo ?? null,
        });
      }
    } catch {
      // Branding is decoration; a failed refresh keeps the current values.
    }
  }, []);

  const contextValue = useMemo<BrandingContextValue>(
    () => ({ ...branding, setBranding: setBrandingState, refresh }),
    [branding, refresh]
  );

  return (
    <BrandingContext.Provider value={contextValue}>
      {children}
    </BrandingContext.Provider>
  );
}

/**
 * Read the current company branding. Falls back to a neutral default when used
 * outside the provider (e.g. in an isolated test render) instead of throwing.
 */
export function useBranding(): BrandingContextValue {
  const context = useContext(BrandingContext);

  if (context) return context;

  return {
    ...FALLBACK,
    setBranding: () => undefined,
    refresh: async () => undefined,
  };
}
