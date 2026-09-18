/**
 * Company logo upload (server-side)
 *
 * Logos land in public/uploads/branding and are read back through /api/serve,
 * so a new file shows up without restarting the app (the standalone Docker
 * build cannot serve files added to public/ after the image was built).
 */

import { mkdir, unlink, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Raster formats only. SVG is deliberately excluded: /api/serve returns it as
 * image/svg+xml, and an SVG can carry script, so accepting one would turn the
 * logo field into a stored-XSS vector.
 */
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'] as const;

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

const BRANDING_DIR = ['public', 'uploads', 'branding'];

export class LogoUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LogoUploadError';
  }
}

/**
 * Persist an uploaded logo and return its public path.
 * Throws LogoUploadError for anything the caller should report as a 400.
 */
export async function saveCompanyLogo(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) {
    throw new LogoUploadError('Logo must be a PNG, JPG or WebP image');
  }

  if (file.size === 0) {
    throw new LogoUploadError('Logo file is empty');
  }

  if (file.size > MAX_LOGO_BYTES) {
    throw new LogoUploadError('Logo must be smaller than 2MB');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const directory = join(process.cwd(), ...BRANDING_DIR);

  if (!existsSync(directory)) {
    await mkdir(directory, { recursive: true });
  }

  // Normalise jpeg -> jpg so there is only ever one candidate per format.
  const normalizedExtension = extension === 'jpeg' ? 'jpg' : extension;
  const fileName = `logo.${normalizedExtension}`;

  await writeFile(join(directory, fileName), buffer);

  // Remove logos in the other formats, otherwise switching from PNG to JPG
  // would leave the old file behind on disk forever.
  await Promise.all(
    ['png', 'jpg', 'webp']
      .filter((candidate) => candidate !== normalizedExtension)
      .map(async (candidate) => {
        const stale = join(directory, `logo.${candidate}`);

        if (existsSync(stale)) {
          try {
            await unlink(stale);
          } catch {
            // A locked or already-removed file must not fail the upload.
          }
        }
      })
  );

  return `/uploads/branding/${fileName}`;
}
