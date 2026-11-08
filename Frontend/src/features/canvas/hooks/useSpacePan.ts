import { useEffect, useState } from 'react';

/** Keep a short Space press native; holding it or using the mouse cancels activation. */
export function installSpacePan(setActive: (active: boolean) => void, host: Window = window): () => void {
  let pressed = false;
  let held = false;
  let startedAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const reset = () => {
    clearTimeout(timer);
    pressed = held = false;
    setActive(false);
  };
  const down = (event: KeyboardEvent) => {
    if (event.code !== 'Space') return;
    if (!pressed) {
      const target = event.target;
      if (
        event.defaultPrevented ||
        (target instanceof Element &&
          target.closest(
            'textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="button"]), select, [contenteditable]:not([contenteditable="false"]), dialog, [role="dialog"], [role="menu"]',
          ))
      )
        return;
      pressed = true;
      startedAt = Date.now();
      setActive(true);
      timer = setTimeout(() => {
        held = true;
      }, 250);
    }
    if (event.repeat) held = true;
    if (held) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    // Empty canvas must not scroll while the key is down. Buttons keep native short presses.
    if (!(event.target instanceof Element && event.target.closest('button, input, [role="button"], [role="checkbox"]')))
      event.preventDefault();
  };
  const up = (event: KeyboardEvent) => {
    if (event.code !== 'Space' || !pressed) return;
    if (held || Date.now() - startedAt >= 250) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    reset();
  };
  const pointer = () => {
    if (pressed) held = true;
  };
  const click = (event: MouseEvent) => {
    if (pressed && held) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  host.addEventListener('keydown', down, true);
  host.addEventListener('keyup', up, true);
  host.addEventListener('mousedown', pointer, true);
  host.addEventListener('click', click, true);
  host.addEventListener('blur', reset);
  return () => {
    reset();
    host.removeEventListener('keydown', down, true);
    host.removeEventListener('keyup', up, true);
    host.removeEventListener('mousedown', pointer, true);
    host.removeEventListener('click', click, true);
    host.removeEventListener('blur', reset);
  };
}

export function useSpacePan(): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => installSpacePan(setActive), []);
  return active;
}
