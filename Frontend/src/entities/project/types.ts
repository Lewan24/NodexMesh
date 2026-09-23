import type { BoardItem } from '@/entities/board/types';
import type { AuditFields, BoardSnapshot } from '@/entities/board/records';

export interface ProjectRecord extends AuditFields {
  userDeletedAt?: string | null;
  role?: 'Owner' | 'Editor' | 'Commenter' | 'Viewer';
  id: string;
  ownerId: string;
  name: string;
  color: string;
}

export interface ProjectSnapshot {
  project: ProjectRecord;
  board: BoardSnapshot;
}

export type ProjectMemberRole = 'editor' | 'commenter' | 'viewer';

export interface ProjectBoard {
  id: string;
  name: string;
  items: BoardItem[];
}

/** Canvas projection. Persistence uses ProjectRecord + BoardSnapshot, never this tree. */
export interface Project {
  boards?: ProjectBoard[];
  boardId?: string;
  role?: ProjectRecord['role'];
  deletedAt?: string;
  id: string;
  name: string;
  color: string;
  items: BoardItem[];
  ownerId: string;
}
