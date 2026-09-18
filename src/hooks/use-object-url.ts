'use client';

/**
 * Blob preview URL for a picked file.
 *
 * Creating the URL in the change handler rather than in an effect keeps the
 * preview a direct result of the user's action: deriving it in an effect means
 * setting state during an effect, which costs an extra render pass and trips
 * `react-hooks/set-state-in-effect`.
 *
 * The previous URL is revoked whenever it is replaced, and the last one on
 * unmount, so selecting several files in a row does not leak blobs.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export function useObjectUrl() {
  const [url, setUrl] = useState<string | null>(null);
  const currentUrl = useRef<string | null>(null);

  const setFile = useCallback((file: File | null) => {
    if (currentUrl.current) {
      URL.revokeObjectURL(currentUrl.current);
    }

    const next = file ? URL.createObjectURL(file) : null;
    currentUrl.current = next;
    setUrl(next);
  }, []);

  useEffect(
    () => () => {
      if (currentUrl.current) {
        URL.revokeObjectURL(currentUrl.current);
        currentUrl.current = null;
      }
    },
    []
  );

  return { url, setFile };
}
