import {
  useEffect,
  useRef,
} from 'react';

import type {
  ReactNode,
} from 'react';

interface ItemWatcherProps {
  itemId: string;

  onResize: (
    itemId: string,
    width: number,
    height: number,
  ) => void;

  children: ReactNode;
}

export default function ItemWatcher({
  itemId,
  onResize,
  children,
}: ItemWatcherProps) {
  const ref =
    useRef<HTMLDivElement>(
      null,
    );

  useEffect(() => {
    const element =
      ref.current;

    if (!element) {
      return;
    }

    const observer =
      new ResizeObserver(
        entries => {
          const entry =
            entries[0];

          if (!entry) {
            return;
          }

          onResize(
            itemId,
            entry.contentRect.width,
            entry.contentRect.height,
          );
        },
      );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [
    itemId,
    onResize,
  ]);

  return (
    <div ref={ref}>
      {children}
    </div>
  );
}