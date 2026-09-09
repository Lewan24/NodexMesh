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
  resetProjects
} from '@/features/projects/storage/projectStorage';

interface UseProjectsResult {
  projects: Project[];
  activeProject: Project | undefined;
  activeProjectId: string;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  addProject: (name: string) => string;
  selectProject: (id: string) => void;
  createFirstProject: () => void;
  resetDemo: () => void;
  renameProject: (id: string, name: string) => void;
  trashProject: (id: string) => void;
  restoreProject: (id: string) => void;
}

export function useProjects(
  userId: string,
): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>(
    () => loadProjects(userId),
  );

  const [activeProjectId, setActiveProjectId] =
    useState<string>(() => projects.find(project => !project.deletedAt)?.id ?? '');

  useEffect(() => {
    saveProjects(userId, projects);
  }, [projects, userId]);

  const activeProject =
    projects.find(project => project.id === activeProjectId && !project.deletedAt) ??
    projects.find(project => !project.deletedAt);

  const renameProject = useCallback((id: string, name: string) => {
    if (!name.trim()) return;
    setProjects(previous => previous.map(project => project.id === id ? { ...project, name: name.trim() } : project));
  }, []);
  const trashProject = useCallback((id: string) => {
    const deletedAt = new Date().toISOString();
    setProjects(previous => previous.map(project => project.id === id ? { ...project, deletedAt } : project));
  }, []);
  const restoreProject = useCallback((id: string) => {
    setProjects(previous => previous.map(project => project.id === id ? { ...project, deletedAt: undefined } : project));
    setActiveProjectId(id);
  }, []);

  const resetDemo = useCallback(() => {
    const freshProjects = resetProjects(userId);

    setProjects(freshProjects);
    setActiveProjectId(freshProjects[0]?.id ?? '');
  }, [userId]);

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

    setProjects(previous => [...previous, project]);
    setActiveProjectId(project.id);
  }, [userId]);

  return {
    projects,
    activeProject,
    activeProjectId: activeProject?.id ?? '',
    setProjects,
    addProject,
    selectProject,
    createFirstProject,
    resetDemo,
    renameProject,
    trashProject,
    restoreProject,
  };
}
