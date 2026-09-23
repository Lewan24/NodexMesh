import type { Project } from '@/entities/project/types';

export interface RecoveryDraft {
  id: string;
  createdAt: string;
  project: Project;
}

export interface RecoveryStore {
  load(): RecoveryDraft[];
  save(draft: RecoveryDraft): void;
  remove(id: string): void;
}

/** Separate keys prevent simultaneous tabs from overwriting each other's recovery copies. */
export function browserRecoveryStore(userId: string): RecoveryStore {
  const prefix = `nodexmesh.recovery.${userId}.`;
  return {
    load() {
      const drafts: RecoveryDraft[] = [];
      try {
        for (let index = 0; index < localStorage.length; index++) {
          const key = localStorage.key(index);
          if (!key?.startsWith(prefix)) continue;
          try {
            const draft = JSON.parse(localStorage.getItem(key) ?? 'null');
            if (
              typeof draft?.id === 'string' &&
              typeof draft?.createdAt === 'string' &&
              typeof draft?.project?.id === 'string' &&
              Array.isArray(draft.project.items)
            )
              drafts.push(draft);
          } catch {
            /* Preserve unreadable entries instead of overwriting them. */
          }
        }
      } catch {
        /* Saving will fail safely if browser storage is unavailable. */
      }
      return drafts.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    save(draft) {
      localStorage.setItem(prefix + draft.id, JSON.stringify(draft));
    },
    remove(id) {
      localStorage.removeItem(prefix + id);
    },
  };
}
