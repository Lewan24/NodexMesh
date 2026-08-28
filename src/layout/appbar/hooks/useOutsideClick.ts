import { useEffect, useRef } from 'react';

interface ElementRef {
  readonly current: HTMLElement | null;
}

export function useOutsideClick(
  enabled: boolean,
  refs: ElementRef[],
  onOutside: () => void,
) {
  const refsRef = useRef(refs);
  refsRef.current = refs;

  const onOutsideRef = useRef(onOutside);
  onOutsideRef.current = onOutside;

  useEffect(() => {
    if (!enabled) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInside = refsRef.current.some(ref => ref.current?.contains(target));

      if (!clickedInside) onOutsideRef.current();
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [enabled]);
}