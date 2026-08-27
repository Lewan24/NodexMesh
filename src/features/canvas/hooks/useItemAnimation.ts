import {
  useCallback,
  useState,
} from 'react';

export function useItemAnimation() {
  const [
    animatingIds,
    setAnimatingIds,
  ] = useState<Set<string>>(
    () => new Set(),
  );

  const triggerEnterAnimation =
    useCallback(
      (id: string) => {
        setAnimatingIds(
          previous => {
            if (
              previous.has(id)
            ) {
              return previous;
            }

            const next =
              new Set(previous);

            next.add(id);

            return next;
          },
        );
      },
      [],
    );

  const clearEnterAnimation =
    useCallback(
      (id: string) => {
        setAnimatingIds(
          previous => {
            if (
              !previous.has(id)
            ) {
              return previous;
            }

            const next =
              new Set(previous);

            next.delete(id);

            return next;
          },
        );
      },
      [],
    );

  return {
    animatingIds,
    triggerEnterAnimation,
    clearEnterAnimation,
  };
}