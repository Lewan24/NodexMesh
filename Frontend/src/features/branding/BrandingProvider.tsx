import { isMockDataSource } from '@/app/services';
import { createContext, useCallback, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { identityMedia, type Branding } from '@/features/identity-media/api';
import { publicImageUrl } from '@/shared/lib/publicImage';

const defaultIcon =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="white"/><g fill="#6023b4"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></g></svg>',
  );
const defaults: Branding = { applicationName: 'NodexMesh', logoId: null };
const Context = createContext({ ...defaults, update: (_value: Branding) => {} });
export const useBranding = () => useContext(Context);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState(defaults);
  const generation = useRef(0);
  const update = useCallback((value: Branding) => {
    generation.current++;
    setBranding(value);
    try {
      localStorage.setItem('nodexmesh.branding-refresh', String(Date.now()));
    } catch {
      /* Other tabs can refresh on focus. */
    }
  }, []);
  useEffect(() => {
    if (isMockDataSource) return;
    const controller = new AbortController();
    const refresh = () => {
      const request = ++generation.current;
      void identityMedia
        .readBranding(AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]))
        .then((value) => {
          if (!controller.signal.aborted && request === generation.current) setBranding(value);
        })
        .catch(() => {});
    };
    const storage = (event: StorageEvent) => {
      if (event.key === 'nodexmesh.branding-refresh') refresh();
    };
    refresh();
    const timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, 60000);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', storage);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', storage);
    };
  }, []);
  useEffect(() => {
    document.title = branding.applicationName;
    let icon = document.querySelector<HTMLLinkElement>('link[data-instance-icon]');
    const source = publicImageUrl(branding.logoId);
    if (!icon) {
      icon = document.createElement('link');
      icon.rel = 'icon';
      icon.dataset.instanceIcon = 'true';
      document.head.append(icon);
    }
    icon.referrerPolicy = 'no-referrer';
    icon.href = source ?? defaultIcon;
  }, [branding]);
  return <Context.Provider value={{ ...branding, update }}>{children}</Context.Provider>;
}
