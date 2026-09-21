import type { BoardMutation, BoardRecord, BoardSnapshot, Revision, TrashedItemRecord } from '@/entities/board/records';
import type { ProjectRecord, ProjectSnapshot } from '@/entities/project/types';

export interface ProjectRepository {
  list(signal?: AbortSignal): Promise<ProjectSnapshot[]>;
  create(input: { id: string; name: string; color: string; clientMutationId: string }): Promise<ProjectSnapshot>;
  update(
    id: string,
    input: {
      name: string;
      color: string;
      deletedAt: string | null;
      expectedRevision: Revision;
      clientMutationId: string;
    },
  ): Promise<ProjectRecord>;
  purge(id: string, expectedRevision: Revision, clientMutationId: string): Promise<void>;
}

export interface BoardRepository {
  list(projectId: string, signal?: AbortSignal): Promise<BoardRecord[]>;
  create(projectId: string, name: string): Promise<BoardSnapshot>;
  rename(projectId: string, boardId: string, name: string): Promise<BoardRecord>;
  delete(projectId: string, boardId: string): Promise<void>;
  get(projectId: string, boardId: string, signal?: AbortSignal): Promise<BoardSnapshot>;
  mutate(projectId: string, boardId: string, mutation: BoardMutation): Promise<BoardSnapshot>;
  listTrash(projectId: string): Promise<TrashedItemRecord[]>;
  restoreTrashItem(
    projectId: string,
    itemId: string,
    targetBoardId: string,
    position?: { x: number; y: number },
  ): Promise<BoardSnapshot>;
  purgeTrashItem(projectId: string, itemId: string): Promise<void>;
  emptyTrash(projectId: string): Promise<void>;
}

export interface WorkspaceServices {
  /** Check revisions first; return a snapshot only if project metadata or board content changed. */
  sync?(previous: ProjectSnapshot, signal?: AbortSignal): Promise<ProjectSnapshot | null>;
  projects: ProjectRepository;
  boards: BoardRepository;
}
