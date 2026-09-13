import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import type { Project } from '@/entities/project/types';
import { createDefaultProjectFor } from '@/entities/project/projectFactory';

import { createWorkspaceServices } from '@/app/services';
import { WorkspaceController, type WorkspaceState } from '../services/workspaceController';
import { registerSaveGuard } from '@/shared/api/pendingChanges';
import { seedProjectsFor } from '@/entities/project/projectSeeder';
import { renewProjectIds } from '../services/boardAdapter';

interface UseProjectsResult {
  status: WorkspaceState['status'];
  error: string;
  retry: () => Promise<void>;
  reload: () => Promise<void>;
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
  emptyTrash: () => void;
  restoreProject: (id: string) => void;
}

export function useProjects(userId: string): UseProjectsResult {
  const [controller] = useState(() => new WorkspaceController(createWorkspaceServices(userId)));
  const { projects, status, error } = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const setProjects = controller.update;

  const [activeProjectId, setActiveProjectId] = useState<string>(
    () => projects.find((project) => !project.deletedAt)?.id ?? '',
  );

  useEffect(() => {
    const abort = new AbortController();
    void controller.load(abort.signal);
    const unregister = registerSaveGuard(async () => {
      await controller.flush();
      return controller.getSnapshot().status === 'saved';
    });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (['pending', 'saving', 'error', 'conflict'].includes(controller.getSnapshot().status)) event.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      abort.abort();
      unregister();
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [controller]);

  const activeProject =
    projects.find((project) => project.id === activeProjectId && !project.deletedAt) ??
    projects.find((project) => !project.deletedAt);

  const renameProject = useCallback((id: string, name: string) => {
    if (!name.trim()) return;
    setProjects((previous) =>
      previous.map((project) => (project.id === id ? { ...project, name: name.trim() } : project)),
    );
  }, [setProjects]);
  const trashProject = useCallback((id: string) => {
    const deletedAt = new Date().toISOString();
    setProjects((previous) => previous.map((project) => (project.id === id ? { ...project, deletedAt } : project)));
  }, [setProjects]);
  const restoreProject = useCallback((id: string) => {
    setProjects((previous) =>
      previous.map((project) => (project.id === id ? { ...project, deletedAt: undefined } : project)),
    );
    setActiveProjectId(id);
  }, []);

  const emptyTrash = useCallback(() => {
    setProjects((previous) => previous.filter((project) => !project.deletedAt));
  }, [setProjects]);

  const resetDemo = useCallback(() => {
    const freshProjects = seedProjectsFor(userId).map(renewProjectIds);

    setProjects(freshProjects);
    setActiveProjectId(freshProjects[0]?.id ?? '');
  }, [userId, setProjects]);

  const addProject = useCallback(
    (name: string): string => {
      const project = createDefaultProjectFor(userId);

      const newProject: Project = { ...project, name };

      setProjects((previous) => [...previous, newProject]);
      setActiveProjectId(newProject.id);

      return newProject.id;
    },
    [userId, setProjects],
  );

  const selectProject = useCallback((id: string) => {
    setActiveProjectId(id);
  }, []);

  const createFirstProject = useCallback(() => {
    const project = createDefaultProjectFor(userId);

    setProjects((previous) => [...previous, project]);
    setActiveProjectId(project.id);
  }, [userId, setProjects]);

  return {
    status,
    error,
    retry: controller.retry,
    reload: () => controller.load(),
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
    emptyTrash,
  };
}

