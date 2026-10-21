import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';
import { observeWheelOverflow } from '../utils/wheelOverflow';

import type { ReactNode } from 'react';
import type { BoardItem } from '@/entities/board/types';

interface ItemWatcherProps {
  itemId: string;
  measurementKey: BoardItem;

  onResize: (itemId: string, width: number, height: number) => void;

  children: ReactNode;
}

export default function ItemWatcher({ itemId, measurementKey, onResize, children }: ItemWatcherProps) {
  useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
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

    return () => {
      observer.disconnect();
      stopObservingOverflow();
    };
  }, [itemId, measurementKey, onResize]);

  return <div ref={ref}>{children}</div>;
}
