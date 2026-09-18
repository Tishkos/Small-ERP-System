'use client';

import { useEffect } from 'react';

/**
 * FontSizeProvider
 * Applies font size from localStorage to the document root on initial load
 * Defaults to 90% if no saved value exists
 */
export function FontSizeProvider() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFontSize = localStorage.getItem('app-font-size');
      const parsed = savedFontSize ? parseInt(savedFontSize, 10) : NaN;
      // A missing or corrupt value must not become `font-size: NaN%`, which
      // the browser drops on the floor and leaves the app at an unexpected size.
      const fontSize = Number.isFinite(parsed) ? parsed : 90;

      // Apply font size immediately
      document.documentElement.style.fontSize = `${fontSize}%`;

      // If there was no usable saved value, persist the default
      if (!Number.isFinite(parsed)) {
        localStorage.setItem('app-font-size', '90');
      }
    }
  }, []);

  return null;
}

