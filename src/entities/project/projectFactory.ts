import type { Project } from './types';
import { PROJECT_COLORS } from '@/entities/project/constants';

export function createDefaultProjectFor(userId: string): Project {
  return { id: createProjectId(), name: 'My Board', color: getRandomProjectColor(), ownerId: userId, items: [] };
}

function createProjectId() {
  return crypto.randomUUID();
}

function getRandomProjectColor() {
  return PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)] ?? PROJECT_COLORS[0];
}
