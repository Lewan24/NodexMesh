export function getEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'].includes(host)) {
      const id =
        host === 'youtu.be'
          ? url.pathname.slice(1)
          : (url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1]);
      if (!id || !/^[\w-]{11}$/.test(id)) return null;
      return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (host === 'vimeo.com' || host === 'www.vimeo.com') {
      const id = url.pathname.match(/^\/(\d+)\/?$/)?.[1];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return url.href;
  } catch {
    return null;
  }
}
