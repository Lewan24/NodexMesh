import { useEffect, useState } from 'react';
import { httpClient } from '@/app/services';
import { parseLibrarySource } from './librarySource';

export function useMediaSource(source: string) {
  const [loaded, setLoaded] = useState<{ source: string; url: string; type: string }>();
  const reference = parseLibrarySource(source);
  useEffect(() => {
    const asset = parseLibrarySource(source);
    if (!asset || !httpClient) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void httpClient
      .request(`/projects/${asset.projectId}/library/${asset.id}/content`, {
        responseType: 'blob',
        signal: controller.signal,
      })
      .then((value) => {
        if (controller.signal.aborted) return;
        const blob = value as Blob;
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ source, url: objectUrl, type: blob.type });
      })
      .catch(() => {
        /* Missing or revoked files render a placeholder. */
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source]);
  if (reference) return loaded?.source === source ? loaded : { url: '', type: '' };
  const video = /\.(mp4|webm)(?:[?#]|$)/i.test(source) || /[?&]type=video/.test(source);
  return {
    url: /^https?:\/\//i.test(source) || source.startsWith('data:image/svg+xml;') ? source : '',
    type: video ? 'video/mp4' : 'image',
  };
}
