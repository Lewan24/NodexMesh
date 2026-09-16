import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import type { Project } from '@/entities/project/types';
import { createDefaultProjectFor } from '@/entities/project/projectFactory';

import { createWorkspaceServices, isMockDataSource } from '@/app/services';
import { importProjectJson } from '../services/projectJson';
import { toast } from 'sonner';
import { WorkspaceController, type WorkspaceState } from '../services/workspaceController';
import { registerSaveGuard } from '@/shared/api/pendingChanges';

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
  importProject: (text: string) => Promise<void>;
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
    projects.find((project) => project.id === controller.resolveProjectId(activeProjectId) && !project.deletedAt) ??
    projects.find((project) => !project.deletedAt);

  const renameProject = useCallback(
    (id: string, name: string) => {
      if (!name.trim()) return;
      setProjects((previous) =>
        previous.map((project) => (project.id === id ? { ...project, name: name.trim() } : project)),
      );
    },
    [setProjects],
  );
  const trashProject = useCallback(
    (id: string) => {
      const deletedAt = new Date().toISOString();
      setProjects((previous) => previous.map((project) => (project.id === id ? { ...project, deletedAt } : project)));
    },
    [setProjects],
  );
  const restoreProject = useCallback((id: string) => {
    setProjects((previous) =>
      previous.map((project) => (project.id === id ? { ...project, deletedAt: undefined } : project)),
    );
    setActiveProjectId(id);
  }, []);

  const emptyTrash = useCallback(() => {
    if (!isMockDataSource) {
      toast.error('Permanent deletion is not supported by the API.');
      return;
    }
    setProjects((previous) => previous.filter((project) => !project.deletedAt));
  }, [setProjects]);

  const resetDemo = useCallback(() => {
    if (isMockDataSource) {
      void controller
        .discardForReset()
        .then(() => {
          localStorage.clear();
          window.location.reload();
        })
        .catch(() => toast.error('Could not clear browser storage.'));
      return;
    }
    toast.error('Demo reset is only available in mock mode.');
  }, [controller]);

  const importProject = async (text: string) => {
    const project = await importProjectJson(text, userId);
    if (controller.getSnapshot().status === 'loading') throw new Error('Wait for projects to load.');
    setProjects((previous) => [...previous, project]);
    setActiveProjectId(project.id);
  };

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
    importProject,
    renameProject,
    trashProject,
    restoreProject,
    emptyTrash,
  };
}
