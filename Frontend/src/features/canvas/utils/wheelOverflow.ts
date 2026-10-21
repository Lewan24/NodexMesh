/** Only scrollable overflow should capture the canvas wheel gesture. */
export function hasWheelOverflow(element: HTMLElement): boolean {
  const style = getComputedStyle(element);
  return (
    (/^(auto|scroll)$/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1) ||
    (/^(auto|scroll)$/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1)
  );
}

interface OverflowPlan {
  apply: () => void;
}
interface OverflowObserver {
  measure: () => OverflowPlan;
}
const pending = new Set<OverflowObserver>();
let pendingFrame: number | null = null;

function schedule(observer: OverflowObserver) {
  pending.add(observer);
  if (pendingFrame !== null) return;
  pendingFrame = requestAnimationFrame(() => {
    pendingFrame = null;
    const batch = [...pending];
    pending.clear();
    // Read layout for every dirty item before writing any scroll attributes.
    const plans = batch.map((entry) => entry.measure());
    for (const plan of plans) plan.apply();
  });
}

/** Shared by editable and read-only items, including asynchronously loaded blocks. */
export function observeWheelOverflow(root: HTMLElement): () => void {
  let active = true;
  let observed = new Set<Element>();
  const written = new WeakMap<HTMLElement, string>();
  const observer: OverflowObserver = {
    measure() {
      const next = new Set<Element>([root]);
      const changes: { element: HTMLElement; value: string }[] = [];
      if (active)
        root.querySelectorAll<HTMLElement>('[data-wheel-scroll]').forEach((element) => {
          changes.push({ element, value: String(hasWheelOverflow(element)) });
          next.add(element);
          for (const child of element.children) next.add(child);
        });
      return {
        apply() {
          if (!active) return;
          for (const { element, value } of changes) {
            written.set(element, value);
            if (element.dataset.wheelScroll !== value) element.dataset.wheelScroll = value;
          }
          for (const element of observed) if (!next.has(element)) resize.unobserve(element);
          for (const element of next) if (!observed.has(element)) resize.observe(element);
          observed = next;
        },
      };
    },
  };
  const resize = new ResizeObserver(() => {
    if (active) schedule(observer);
  });
  const mutations = new MutationObserver((records) => {
    if (!active) return;
    const changed = records.some(
      (record) =>
        record.type !== 'attributes' ||
        record.attributeName !== 'data-wheel-scroll' ||
        written.get(record.target as HTMLElement) !== (record.target as HTMLElement).dataset.wheelScroll,
    );
    if (changed) schedule(observer);
  });
  mutations.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'data-wheel-scroll'],
  });
  schedule(observer);
  return () => {
    active = false;
    pending.delete(observer);
    resize.disconnect();
    mutations.disconnect();
    if (pending.size === 0 && pendingFrame !== null) {
      cancelAnimationFrame(pendingFrame);
      pendingFrame = null;
    }
  };
}
