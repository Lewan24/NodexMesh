/** Only scrollable overflow should capture the canvas wheel gesture. */
export function hasWheelOverflow(element: HTMLElement): boolean {
  const style = getComputedStyle(element);
  return (
    (/^(auto|scroll)$/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1) ||
    (/^(auto|scroll)$/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1)
  );
}

/** Shared by editable and read-only items, including asynchronously loaded blocks. */
export function observeWheelOverflow(root: HTMLElement): () => void {
  const resize = new ResizeObserver(update);
  let observed = new Set<Element>();
  function update() {
    const next = new Set<Element>([root]);
    root.querySelectorAll<HTMLElement>('[data-wheel-scroll]').forEach((element) => {
      const value = String(hasWheelOverflow(element));
      if (element.dataset.wheelScroll !== value) element.dataset.wheelScroll = value;
      next.add(element);
      for (const child of element.children) next.add(child);
    });
    for (const element of observed) if (!next.has(element)) resize.unobserve(element);
    for (const element of next) if (!observed.has(element)) resize.observe(element);
    observed = next;
  }
  const mutations = new MutationObserver(update);
  mutations.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'data-wheel-scroll'],
  });
  update();
  return () => {
    resize.disconnect();
    mutations.disconnect();
  };
}
