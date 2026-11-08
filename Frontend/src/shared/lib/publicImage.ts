export const imageUploadLimit = 10 * 1024 * 1024;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function publicImageUrl(id?: string | null): string | undefined {
  return id && uuid.test(id)
    ? `${(import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')}/media/images/${id}`
    : undefined;
}
export function imageFileError(file: File, logo = false): string | undefined {
  if (logo && /\.svg$/i.test(file.name) && file.size > 1_000_000) return 'SVG must be smaller than 1 MB.';
  if (file.size === 0 || file.size > imageUploadLimit) return 'Choose an image smaller than 10 MB.';
  if (!(logo ? /\.(png|jpe?g|gif|webp|svg)$/i : /\.(png|jpe?g|gif|webp)$/i).test(file.name))
    return logo ? 'Use PNG, JPEG, GIF, WebP or static SVG.' : 'Use PNG, JPEG, GIF or WebP.';
  return undefined;
}

/** The server needs the format, never the user's original filename. */
export function imageUploadName(file: Pick<File, 'name'>): string {
  return `image${file.name.match(/\.(png|jpe?g|gif|webp|svg)$/i)?.[0].toLowerCase() ?? ''}`;
}
