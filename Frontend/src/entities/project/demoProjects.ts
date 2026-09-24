import demoArchive from './demoProject.json';
import type { Project } from '@/entities/project/types';
import { DEMO_USER_ID } from '@/entities/user/mockUsers';

// Keep the app export as the single source of demo content. The transfer tests validate it.
const source = demoArchive.project as unknown as Project;
const boards = source.boards!;
const main = boards.find((board) => board.id === source.boardId)!;

export const nodexMeshDemoProject: Project = {
  ...source,
  ownerId: DEMO_USER_ID,
  role: 'Owner',
  items: main.items,
  boards: [main, ...boards.filter((board) => board !== main)],
};

export const demoProjects: Project[] = [nodexMeshDemoProject];
