import { useLayoutEffect, useRef, useState } from 'react';

/** Stable event props with the latest committed geometry/permissions. Keys must remain fixed. */
export function useCanvasCallbacks<T extends Record<string, (...args: never[]) => unknown>>(callbacks: T): T {
  const committed = useRef(callbacks);
  useLayoutEffect(() => {
    committed.current = callbacks;
  });
  const [stable] = useState(
    () =>
      Object.fromEntries(
        Object.keys(callbacks).map((key) => [key, (...args: never[]) => committed.current[key]!(...args)]),
      ) as T,
  );
  return stable;
}
