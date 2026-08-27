import type { Project } from '@/entities/project/types';
import { seedProjectsFor } from '@/entities/project/projectSeeder';

const getProjectsStorageKey = (userId: string) =>
  `nodexmesh_projects_${userId}`;

export function loadProjects(userId: string): Project[] {
  try {
    const raw = localStorage.getItem(
      getProjectsStorageKey(userId)
    );

    if (raw) {
      const projects = JSON.parse(raw) as Project[];

      if (Array.isArray(projects) && projects.length > 0) {
        return projects;
      }
    }
  } catch {
    // fallback below
  }

  return seedProjectsFor(userId);
}

export function saveProjects(
  userId: string,
  projects: Project[],
): void {
  localStorage.setItem(
    getProjectsStorageKey(userId),
    JSON.stringify(projects),
  );
}