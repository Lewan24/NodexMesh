type SaveGuard = (retryFailedSaves?: boolean) => Promise<boolean>;
const guards = new Map<SaveGuard, (() => boolean) | undefined>();

function beforeUnload(event: BeforeUnloadEvent) {
  if ([...guards.values()].some((hasPendingChanges) => hasPendingChanges?.())) event.preventDefault();
}

export function registerSaveGuard(guard: SaveGuard, hasPendingChanges?: () => boolean): () => void {
  if (guards.size === 0 && typeof window !== 'undefined') window.addEventListener('beforeunload', beforeUnload);
  guards.set(guard, hasPendingChanges);
  return () => {
    guards.delete(guard);
    if (guards.size === 0 && typeof window !== 'undefined') window.removeEventListener('beforeunload', beforeUnload);
  };
}

/** Failed views may unmount, but their pending writes must still block reload/logout. */
export function registerPersistentSaveGuard(guard: SaveGuard, hasPendingChanges: () => boolean): () => void {
  let detached = false;
  const save: SaveGuard = async (retryFailedSaves) => {
    const saved = await guard(retryFailedSaves);
    // A new edit may have entered the queue while the awaited save completed.
    const complete = saved && !hasPendingChanges();
    if (complete && detached) unregister();
    return complete;
  };
  const unregister = registerSaveGuard(save, hasPendingChanges);
  return () => {
    detached = true;
    if (!hasPendingChanges()) unregister();
    else void save().catch(() => undefined);
  };
}

export async function flushPendingChanges(retryFailedSaves = false): Promise<boolean> {
  // Follow registrations made while an earlier save is in flight (for example,
  // opening another project). A frozen list could miss its pending changes.
  for (const guard of guards.keys()) if (!(await guard(retryFailedSaves))) return false;
  return true;
}
