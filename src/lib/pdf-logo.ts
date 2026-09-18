/**
 * Company logo for generated PDFs (client-side)
 *
 * Printed documents used to embed a hardcoded `/assets/logo/arbati.png`, so
 * every installation shipped someone else's brand on its invoices and price
 * lists. This resolves the configured company logo instead, and falls back to an
 * initials monogram drawn on a canvas so a company that never uploaded a file
 * still gets a deliberate-looking mark rather than a blank space.
 *
 * The returned width/height already fit the requested box while preserving the
 * image's aspect ratio; the previous code stretched the logo to fixed
 * dimensions, which distorted anything that was not the original's shape.
 */

import { getServeUrl } from './serve-url';

export interface PdfLogo {
  dataUrl: string;
  /** Format string jsPDF's addImage expects. */
  format: 'PNG' | 'JPEG' | 'WEBP';
  width: number;
  height: number;
}

function formatFromDataUrl(dataUrl: string): PdfLogo['format'] {
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
    return 'JPEG';
  }

  if (dataUrl.startsWith('data:image/webp')) {
    return 'WEBP';
  }

  return 'PNG';
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function measure(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = dataUrl;
  });
}

/** Scale (w, h) down to fit inside the box, keeping the aspect ratio. */
function fitInto(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (!width || !height) return { width: maxWidth, height: maxHeight };

  const scale = Math.min(maxWidth / width, maxHeight / height);

  return { width: width * scale, height: height * scale };
}

/** Up to two initials, matching the on-screen monogram. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return words.map((word) => word[0]).join('').toUpperCase();
}

/**
 * Draw an initials monogram sized to the requested box. Dark mark on white,
 * which is what reads correctly on paper regardless of the app theme.
 */
function drawMonogram(name: string, maxWidth: number, maxHeight: number): PdfLogo | null {
  // 4 device pixels per mm keeps the text crisp at print scale.
  const pixelsPerMm = 4;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(maxWidth * pixelsPerMm));
  canvas.height = Math.max(1, Math.round(maxHeight * pixelsPerMm));

  const context = canvas.getContext('2d');

  if (!context) return null;

  const text = initials(name);

  context.fillStyle = '#111827';
  context.font = `600 ${Math.round(canvas.height * 0.62)}px Helvetica, Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    format: 'PNG',
    width: maxWidth,
    height: maxHeight,
  };
}

/**
 * Load the company logo ready for `doc.addImage(...)`.
 * Returns null only when there is nothing renderable at all.
 */
export async function loadCompanyLogoForPdf(
  maxWidth: number,
  maxHeight: number
): Promise<PdfLogo | null> {
  let companyName = 'Company';
  let logoPath: string | null = null;

  try {
    const response = await fetch('/api/company', { cache: 'no-store' });

    if (response.ok) {
      const data = await response.json();
      companyName = data?.company?.name || companyName;
      logoPath = data?.company?.logo ?? null;
    }
  } catch {
    // Fall through to the monogram.
  }

  const resolved = getServeUrl(logoPath);

  if (resolved) {
    try {
      const response = await fetch(resolved);

      if (response.ok) {
        const dataUrl = await toDataUrl(await response.blob());
        const natural = await measure(dataUrl);
        const fitted = fitInto(natural.width, natural.height, maxWidth, maxHeight);

        return { dataUrl, format: formatFromDataUrl(dataUrl), ...fitted };
      }
    } catch (error) {
      console.warn('Could not load company logo, using monogram instead:', error);
    }
  }

  return drawMonogram(companyName, maxWidth, maxHeight);
}
