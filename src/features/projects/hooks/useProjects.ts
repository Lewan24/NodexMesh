import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import type { Project } from '@/entities/project/types';
import { createDefaultProjectFor } from '@/entities/project/projectFactory';

import {
  loadProjects,
  saveProjects,
} from '@/features/projects/storage/projectStorage';

interface UseProjectsResult {
  projects: Project[];
  activeProject: Project | undefined;
  activeProjectId: string;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  addProject: (name: string) => string;
  selectProject: (id: string) => void;
  createFirstProject: () => void;
}

export function useProjects(
  userId: string,
): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>(
    () => loadProjects(userId),
  );

  const [activeProjectId, setActiveProjectId] =
    useState<string>(() => projects[0]?.id ?? '');

  useEffect(() => {
    saveProjects(userId, projects);
  }, [projects, userId]);

  const activeProject =
    projects.find(project => project.id === activeProjectId) ??
    projects[0];

  const addProject = useCallback(
    (name: string): string => {
      const project = createDefaultProjectFor(userId);

      const newProject: Project = {
        ...project,
        name,
      };

      setProjects(previous => [...previous, newProject]);
      setActiveProjectId(newProject.id);

      return newProject.id;
    },
    [userId],
  );

  const selectProject = useCallback((id: string) => {
    setActiveProjectId(id);
  }, []);

  const createFirstProject = useCallback(() => {
    const project = createDefaultProjectFor(userId);

    setProjects([project]);
    setActiveProjectId(project.id);
  }, [userId]);

  return {
    projects,
    activeProject,
    activeProjectId,
    setProjects,
    addProject,
    selectProject,
    createFirstProject,
  };
}