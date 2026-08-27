import { demoProjects } from '@/entities/project/demoProjects';
import { createDefaultProjectFor } from './projectFactory';
import type { Project } from './types';
import { DEMO_USER_ID } from '@/entities/user/mockUsers';

export function seedProjectsFor(userId: string): Project[] {
  if (userId === DEMO_USER_ID) {
    return demoProjects;
  }

  return [createDefaultProjectFor(userId)];
}