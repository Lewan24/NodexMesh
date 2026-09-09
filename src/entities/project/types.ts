import type { BoardItem } from '@/entities/board/types';

export interface Project {
  deletedAt?: string;
  id: string;
  name: string;
  color: string;
  items: BoardItem[];
  ownerId: string;
}
