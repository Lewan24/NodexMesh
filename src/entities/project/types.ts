import type { BoardItem } from '@/entities/board/types';

export interface Project {
  id: string;
  name: string;
  color: string;
  items: BoardItem[];
  ownerId: string;
}