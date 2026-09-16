import type { BoardMutation, BoardSnapshot, Revision } from '@/entities/board/records';
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
  get(projectId: string, boardId: string, signal?: AbortSignal): Promise<BoardSnapshot>;
  mutate(projectId: string, boardId: string, mutation: BoardMutation): Promise<BoardSnapshot>;
}

export interface WorkspaceServices {
  projects: ProjectRepository;
  boards: BoardRepository;
}
