const guards = new Set<(retryFailedSaves?: boolean) => Promise<boolean>>();

export function registerSaveGuard(guard: (retryFailedSaves?: boolean) => Promise<boolean>): () => void {
  guards.add(guard);
  return () => {
    guards.delete(guard);
  };
}

export async function flushPendingChanges(retryFailedSaves = false): Promise<boolean> {
  for (const guard of guards) if (!(await guard(retryFailedSaves))) return false;
  return true;
}
