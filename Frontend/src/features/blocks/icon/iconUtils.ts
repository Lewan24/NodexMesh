import type { IconItem } from '@/entities/board/types';

export function getIconImageSource(mode: IconItem['iconMode'], source: string): string | undefined {
  if (mode === 'svg' && source.length <= 200_000 && /<svg[\s>]/i.test(source)) {
    // Render as an isolated image, never as markup in the application's DOM.
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  }
  if (mode === 'url') {
    try {
      const url = new URL(source);
      if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return url.href;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function prepareIconSvg(source: string): string {
  if (source.length > 200_000) throw new Error('SVG is too large (maximum 200,000 characters).');
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (document.querySelector('parsererror') || document.documentElement.localName !== 'svg') {
    throw new Error('Paste a valid SVG with an <svg> root element.');
  }
  document.documentElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(document.documentElement);
}
