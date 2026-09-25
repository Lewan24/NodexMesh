import { mergeChanges } from '@/features/projects/services/collaborationMerge';
import { canonicalJson } from '@/shared/api/canonicalJson';
import type { BoardItem } from '@/entities/board/types';

// Persisted snapshots supply defaults omitted by newly created local items.
// Compare their meaning so acknowledgements never become separate undo steps.
function snapshotKey(items: BoardItem[]): string {
  const normalize = (item: BoardItem): unknown => ({
    ...item,
    frameId: item.frameId ?? null,
    locked: item.locked ?? false,
    tags: item.tags ?? [],
    comments: item.comments ?? [],
    ...(item.type === 'column' ? { items: item.items.map(normalize) } : {}),
    ...(item.type === 'document' ? { contentFormat: 'tiptap-html', contentVersion: 1 } : {}),
  });
  return canonicalJson(items.map(normalize));
}

/** Immutable board snapshots, grouped by user interaction rather than render count. */
export class ItemHistory {
  private past: BoardItem[][] = [];
  private current: BoardItem[];
  private checkpoint = true;
  constructor(
    items: BoardItem[] = [],
    private limit = 100,
  ) {
    this.current = items;
  }
  boundary() {
    this.checkpoint = true;
  }
  observe(items: BoardItem[]) {
    if (items === this.current) return;
    if (snapshotKey(items) === snapshotKey(this.current)) {
      this.current = items;
      return;
    }
    if (this.checkpoint) {
      this.past.push(this.current);
      if (this.past.length > this.limit) this.past.shift();
      this.checkpoint = false;
    }
    this.current = items;
  }
  undo(items: BoardItem[]) {
    this.observe(items);
    let previous = this.past.pop();
    const serialized = snapshotKey(this.current);
    while (previous && snapshotKey(previous) === serialized) previous = this.past.pop();
    if (!previous) return;
    this.current = previous;
    this.checkpoint = true;
    return previous;
  }
  /** Carry incoming edits through undo checkpoints; never undo a collaborator's changes. */
  rebase(items: BoardItem[]) {
    this.past = this.past.flatMap((previous) => {
      try {
        return [mergeChanges(this.current, previous, items) as BoardItem[]];
      } catch {
        return [];
      }
    });
    this.current = items;
    this.checkpoint = true;
  }
  clear(items: BoardItem[]) {
    this.past = [];
    this.current = items;
    this.checkpoint = true;
  }
}
