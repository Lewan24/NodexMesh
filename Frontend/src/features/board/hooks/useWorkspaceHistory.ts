import { useEffect, useRef, useState } from 'react';
import { createId } from '@/shared/lib/createId';

export interface WorkspaceLocation {
  projectId: string;
  boardId: string;
  trail: Array<{ id: string; name: string }>;
}

const sameLocation = (a: WorkspaceLocation, b: WorkspaceLocation) =>
  a.projectId === b.projectId && a.boardId === b.boardId;

/** Native history also supports browser back/forward and mice whose buttons are handled by the browser. */
export function useWorkspaceHistory(
  location: WorkspaceLocation | null,
  navigate: (location: WorkspaceLocation) => Promise<void>,
  onError: () => void,
) {
  const [session] = useState(createId);
  const entries = useRef<WorkspaceLocation[]>([]);
  const index = useRef(-1);
  const pending = useRef<WorkspaceLocation | null>(null);
  const latest = useRef({ location, navigate, onError });
  latest.current = { location, navigate, onError };

  useEffect(() => {
    if (!location) return;
    if (pending.current) {
      if (sameLocation(pending.current, location)) pending.current = null;
      return;
    }
    if (index.current >= 0 && sameLocation(entries.current[index.current]!, location)) return;
    entries.current = entries.current.slice(0, index.current + 1);
    entries.current.push(location);
    index.current = entries.current.length - 1;
    const state = { ...window.history.state, workspace: { session: session, index: index.current } };
    if (index.current === 0) window.history.replaceState(state, '');
    else window.history.pushState(state, '');
  }, [location, session]);

  useEffect(() => {
    const pop = (event: PopStateEvent) => {
      const state = event.state?.workspace;
      if (state?.session !== session || !Number.isInteger(state.index)) return;
      const target = entries.current[state.index];
      if (!target) return;
      if (pending.current) {
        if (state.index !== index.current) window.history.go(index.current - state.index);
        return;
      }
      const previousIndex = index.current;
      index.current = state.index;
      if (latest.current.location && sameLocation(latest.current.location, target)) return;
      pending.current = target;
      void latest.current.navigate(target).catch(() => {
        // An inaccessible/deleted board or a failed save must not corrupt the current history entry.
        pending.current = null;
        index.current = previousIndex;
        window.history.go(previousIndex - state.index);
        latest.current.onError();
      });
    };
    const mouse = (event: MouseEvent) => {
      if (event.button !== 3 && event.button !== 4) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.type !== 'mouseup' || pending.current) return;
      const next = index.current + (event.button === 3 ? -1 : 1);
      if (next >= 0 && next < entries.current.length) window.history.go(event.button === 3 ? -1 : 1);
    };
    window.addEventListener('popstate', pop);
    window.addEventListener('mousedown', mouse, true);
    window.addEventListener('mouseup', mouse, true);
    window.addEventListener('auxclick', mouse, true);
    return () => {
      window.removeEventListener('popstate', pop);
      window.removeEventListener('mousedown', mouse, true);
      window.removeEventListener('mouseup', mouse, true);
      window.removeEventListener('auxclick', mouse, true);
    };
  }, [session]);
}
