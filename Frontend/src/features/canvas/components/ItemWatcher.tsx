import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';
import { observeWheelOverflow } from '../utils/wheelOverflow';

import type { ReactNode } from 'react';

interface ItemWatcherProps {
  itemId: string;

  onResize: (itemId: string, width: number, height: number) => void;

  children: ReactNode;
}

export default function ItemWatcher({ itemId, onResize, children }: ItemWatcherProps) {
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
  }, [itemId, onResize]);

  return <div ref={ref}>{children}</div>;
}
