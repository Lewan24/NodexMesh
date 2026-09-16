import { mergeChanges } from '@/features/projects/services/collaborationMerge';
import type { BoardItem } from '@/entities/board/types';

/** Immutable board snapshots, grouped by user interaction rather than render count. */
export class ItemHistory {
  private past: BoardItem[][] = [];
  private current: BoardItem[];
  private checkpoint = true;
  constructor(
    items: BoardItem[],
    private limit: number,
  ) {
    this.current = items;
  }
  boundary() {
    this.checkpoint = true;
  }
  observe(items: BoardItem[]) {
    if (items === this.current) return;
    if (JSON.stringify(items) === JSON.stringify(this.current)) {
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
    const serialized = JSON.stringify(this.current);
    while (previous && JSON.stringify(previous) === serialized) previous = this.past.pop();
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
