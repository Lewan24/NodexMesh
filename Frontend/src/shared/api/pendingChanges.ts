const guards = new Set<() => Promise<boolean>>();

export function registerSaveGuard(guard: () => Promise<boolean>): () => void {
  guards.add(guard);
  return () => {
    guards.delete(guard);
  };
}

export async function flushPendingChanges(): Promise<boolean> {
  for (const guard of guards) if (!(await guard())) return false;
  return true;
}
