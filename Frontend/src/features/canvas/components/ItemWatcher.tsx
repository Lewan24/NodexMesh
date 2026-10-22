import { useTranslation } from 'react-i18next';
import { useLayoutEffect, useRef } from 'react';
import { observeWheelOverflow } from '../utils/wheelOverflow';

import type { ReactNode } from 'react';
import type { BoardItem } from '@/entities/board/types';

interface ItemWatcherProps {
  itemId: string;
  measurementKey: BoardItem;
  suspended?: boolean;

  onResize: (itemId: string, width: number, height: number) => void;

  children: ReactNode;
}

export default function ItemWatcher({
  itemId,
  measurementKey,
  onResize,
  children,
  suspended = false,
}: ItemWatcherProps) {
  useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element || suspended) {
      return;
    }

    const stopObservingOverflow = observeWheelOverflow(element);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry || element.querySelector('[data-block-loading="true"]')) {
        return;
      }

      onResize(itemId, entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(element);

    // Lazy content can replace a same-sized placeholder without a resize event.
    // Re-observe once it resolves so geometry is measured even when bounds match.
    const loading = element.querySelector('[data-block-loading="true"]');
    const loaded = loading
      ? new MutationObserver(() => {
          if (element.querySelector('[data-block-loading="true"]')) return;
          loaded?.disconnect();
          observer.unobserve(element);
          observer.observe(element);
        })
      : null;
    loaded?.observe(element, { childList: true, subtree: true });

    return () => {
      loaded?.disconnect();
      observer.disconnect();
      stopObservingOverflow();
    };
  }, [itemId, measurementKey, onResize, suspended]);

  return <div ref={ref}>{children}</div>;
}
