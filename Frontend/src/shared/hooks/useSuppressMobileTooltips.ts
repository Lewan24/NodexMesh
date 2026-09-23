import { useLayoutEffect } from 'react';

import { useMobileLayout } from '@/shared/components/dialogs/MobilePanel';

/** Native title popovers linger over touch UIs, so remove them while the mobile layout is active. */
export function useSuppressMobileTooltips() {
  const mobile = useMobileLayout();

  useLayoutEffect(() => {
    if (!mobile) return;

    const suppressed = new Map<Element, string>();
    const suppressElement = (element: Element) => {
      const title = element.getAttribute('title');
      if (title === null) return;
      suppressed.set(element, title);
      element.removeAttribute('title');
    };
    const suppressTree = (root: ParentNode) => {
      if (root instanceof Element && root.hasAttribute('title')) suppressElement(root);
      root.querySelectorAll('[title]').forEach(suppressElement);
    };

    suppressTree(document);
    const suppressFromEvent = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const titled = target.closest('[title]');
      if (titled) suppressElement(titled);
    };
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') suppressElement(mutation.target as Element);
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) suppressTree(node);
        });
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'] });
    document.addEventListener('pointerover', suppressFromEvent, true);
    document.addEventListener('pointerdown', suppressFromEvent, true);
    document.addEventListener('touchstart', suppressFromEvent, true);
    document.addEventListener('focusin', suppressFromEvent, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('pointerover', suppressFromEvent, true);
      document.removeEventListener('pointerdown', suppressFromEvent, true);
      document.removeEventListener('touchstart', suppressFromEvent, true);
      document.removeEventListener('focusin', suppressFromEvent, true);
      suppressed.forEach((title, element) => {
        if (element.isConnected && !element.hasAttribute('title')) element.setAttribute('title', title);
      });
    };
  }, [mobile]);
}
