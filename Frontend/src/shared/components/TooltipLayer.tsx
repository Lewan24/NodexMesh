import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './tooltip.css';

interface TooltipContent {
  anchor: HTMLElement;
  title: string;
  description?: string;
}

/** One delegated tooltip for the whole UI, including controls added by lazy block editors.
 * Native titles remain a useful fallback when this layer is unavailable.
 */
export default function TooltipLayer() {
  const id = useId();
  const popup = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<TooltipContent | null>(null);

  useEffect(() => {
    let anchor: HTMLElement | null = null;
    let nativeTitle: string | null = null;
    let previousDescription: string | null = null;
    let addedLabel = false;
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    let observer: MutationObserver | undefined;
    let dismissed = false;
    let visible = false;
    let pointerFocus = false;

    const restore = () => {
      observer?.disconnect();
      if (anchor) {
        if (nativeTitle !== null && !anchor.getAttribute('title')) anchor.setAttribute('title', nativeTitle);
        if (anchor.getAttribute('aria-describedby')?.split(' ').includes(id)) {
          if (previousDescription) anchor.setAttribute('aria-describedby', previousDescription);
          else anchor.removeAttribute('aria-describedby');
        }
        if (addedLabel) anchor.removeAttribute('aria-label');
      }
      anchor = null;
      nativeTitle = previousDescription = null;
      addedLabel = false;
    };
    const hide = () => {
      visible = false;
      clearTimeout(showTimer);
      clearTimeout(closeTimer);
      setContent(null);
      if (anchor) {
        if (previousDescription) anchor.setAttribute('aria-describedby', previousDescription);
        else anchor.removeAttribute('aria-describedby');
      }
    };
    const close = () => {
      hide();
      restore();
    };
    const insidePopup = (target: EventTarget | null) => target instanceof Node && popup.current?.contains(target);
    const show = (element: HTMLElement, immediate: boolean) => {
      clearTimeout(closeTimer);
      if (element === anchor) return;
      close();
      anchor = element;
      dismissed = false;
      nativeTitle = element.getAttribute('title');
      previousDescription = element.getAttribute('aria-describedby');
      // Remove the browser bubble only while the pointer/focus is on this control.
      if (nativeTitle !== null) element.removeAttribute('title');
      const title = element.dataset.tooltip ?? nativeTitle ?? '';
      if (!title.trim()) return;
      if (
        !element.hasAttribute('aria-label') &&
        !element.hasAttribute('aria-labelledby') &&
        ((!element.textContent?.trim() && element.matches('button, [role="button"]')) ||
          (element.matches('input, textarea, select') && !(element as HTMLInputElement).labels?.length))
      ) {
        element.setAttribute('aria-label', title);
        addedLabel = true;
      }
      const reveal = () => {
        if (!element.isConnected || dismissed) return;
        visible = true;
        element.setAttribute('aria-describedby', [previousDescription, id].filter(Boolean).join(' '));
        setContent({ anchor: element, title, description: element.dataset.tooltipDescription });
      };
      if (immediate) reveal();
      else showTimer = setTimeout(reveal, 380);
      // A re-render may update a title while it is being displayed (e.g. language changes).
      observer = new MutationObserver(() => {
        const updated = element.getAttribute('title');
        if (updated !== null) {
          nativeTitle = updated;
          element.removeAttribute('title');
        }
        if (!dismissed)
          setContent((current) =>
            current?.anchor === element
              ? {
                  anchor: element,
                  title: element.dataset.tooltip ?? nativeTitle ?? '',
                  description: element.dataset.tooltipDescription,
                }
              : current,
          );
      });
      observer.observe(element, {
        attributes: true,
        attributeFilter: ['title', 'data-tooltip', 'data-tooltip-description'],
      });
    };
    const enter = (event: Event) => {
      if (insidePopup(event.target)) {
        clearTimeout(closeTimer);
        return;
      }
      if (event instanceof PointerEvent && (event.pointerType === 'touch' || event.buttons !== 0)) return;
      const candidate =
        event.target instanceof Element ? event.target.closest<HTMLElement>('[data-tooltip], [title]') : null;
      const target =
        event.target instanceof Node && anchor?.contains(event.target) && (!candidate || candidate.contains(anchor))
          ? anchor
          : candidate;
      if (!target || target.matches('iframe, svg, option') || target.closest('[data-tooltip-disabled]')) return;
      if (event.type === 'pointerover' && !window.matchMedia('(hover: hover)').matches) return;
      if (event.type === 'focusin' && pointerFocus) return;
      show(target, event.type === 'focusin');
    };
    const leave = (event: Event) => {
      const related = (event as FocusEvent | PointerEvent).relatedTarget;
      if (related instanceof Node && (anchor?.contains(related) || insidePopup(related))) return;
      // Hover and keyboard focus can coexist. Keep the explanation until both leave.
      if (anchor && (anchor.contains(document.activeElement) || anchor.matches(':hover'))) return;
      clearTimeout(closeTimer);
      closeTimer = setTimeout(close, 120);
    };
    const dismiss = (event?: Event) => {
      if (event?.type === 'pointerdown') {
        pointerFocus = true;
        // Touch controls keep their action; only explicit informational badges open on tap.
        if (event instanceof PointerEvent && event.pointerType === 'touch') {
          const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[title]') : null;
          if (target && !target.matches('iframe, svg, option')) show(target, false);
        }
      }
      dismissed = true;
      hide();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Tab') pointerFocus = false;
      if (event.key === 'Escape' && visible) {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      }
      if (
        visible &&
        event.key.length === 1 &&
        event.target instanceof Element &&
        event.target.matches('input, textarea, [contenteditable="true"]')
      )
        dismiss();
    };
    const click = (event: Event) => {
      const target =
        event.target instanceof Element ? event.target.closest<HTMLElement>('[data-tooltip-on-click]') : null;
      if (target) {
        close();
        show(target, true);
      }
    };
    document.addEventListener('pointerover', enter, true);
    document.addEventListener('focusin', enter, true);
    document.addEventListener('pointerout', leave, true);
    document.addEventListener('focusout', leave, true);
    document.addEventListener('pointerdown', dismiss, true);
    document.addEventListener('keydown', key, true);
    document.addEventListener('click', click, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('wheel', close, { capture: true, passive: true });
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    return () => {
      close();
      document.removeEventListener('pointerover', enter, true);
      document.removeEventListener('focusin', enter, true);
      document.removeEventListener('pointerout', leave, true);
      document.removeEventListener('focusout', leave, true);
      document.removeEventListener('pointerdown', dismiss, true);
      document.removeEventListener('keydown', key, true);
      document.removeEventListener('click', click, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('wheel', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
    };
  }, [id]);

  useLayoutEffect(() => {
    const element = popup.current;
    if (!element || !content) return;
    // The top layer also works above native dialogs, independent of canvas transforms/z-index.
    element.showPopover?.();
    const rect = content.anchor.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    element.style.left = `${Math.max(8, Math.min(rect.left + rect.width / 2 - box.width / 2, window.innerWidth - box.width - 8))}px`;
    element.style.top = `${Math.max(8, rect.bottom + box.height + 10 <= window.innerHeight ? rect.bottom + 8 : rect.top - box.height - 8)}px`;
    return () => element.hidePopover?.();
  }, [content]);

  if (!content) return null;
  return createPortal(
    <div ref={popup} id={id} role="tooltip" popover="manual" className="app-tooltip" data-canvas-ui="true">
      <strong>{content.title}</strong>
      {content.description
        ?.split('\n')
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
    </div>,
    content.anchor.closest('dialog') ?? document.body,
  );
}
