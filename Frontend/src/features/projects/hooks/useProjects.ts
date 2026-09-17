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
  remoteVersion: number;
  liveStatus: string;
  error: string;
  retry: () => Promise<void>;
  reload: () => Promise<void>;
  projects: Project[];
  activeProject: Project | undefined;
  activeProjectId: string;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  addProject: (name: string) => string;
  selectProject: (id: string) => void;
  selectBoard: (projectId: string, boardId: string) => Promise<void>;
  listBoards: (projectId: string) => Promise<import('@/entities/board/records').BoardRecord[]>;
  createBoard: (projectId: string, name: string) => Promise<import('@/entities/board/records').BoardSnapshot>;
  renameBoard: (
    projectId: string,
    boardId: string,
    name: string,
  ) => Promise<import('@/entities/board/records').BoardRecord>;
  deleteBoard: (projectId: string, boardId: string) => Promise<void>;
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

  const [liveStatus, setLiveStatus] = useState('Connecting live updates...');
  const viewedProjectId = activeProject?.id ?? '';
  useEffect(() => {
    if (isMockDataSource || !viewedProjectId) return;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let running = false;
    let failures = 0;
    const tick = async () => {
      if (running || abort.signal.aborted) return;
      clearTimeout(timer);
      if (document.hidden) {
        timer = setTimeout(() => void tick(), 2000);
        return;
      }
      running = true;
      try {
        await controller.syncProject(viewedProjectId, abort.signal);
        failures = 0;
        if (!abort.signal.aborted) setLiveStatus('Live updates on');
      } catch {
        failures++;
        if (!abort.signal.aborted) setLiveStatus('Live updates reconnecting...');
      } finally {
        running = false;
        if (!abort.signal.aborted) timer = setTimeout(() => void tick(), Math.min(30000, 1500 * 2 ** failures));
      }
    };
    const wake = () => {
      if (!document.hidden) void tick();
    };
    void tick();
    window.addEventListener('online', wake);
    window.addEventListener('focus', wake);
    document.addEventListener('visibilitychange', wake);
    return () => {
      abort.abort();
      clearTimeout(timer);
      window.removeEventListener('online', wake);
      window.removeEventListener('focus', wake);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [controller, viewedProjectId]);

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
  const selectBoard = useCallback(
    (projectId: string, boardId: string) => controller.switchBoard(projectId, boardId),
    [controller],
  );
  const listBoards = useCallback((projectId: string) => controller.listBoards(projectId), [controller]);
  const createBoard = useCallback(
    (projectId: string, name: string) => controller.createBoard(projectId, name),
    [controller],
  );
  const renameBoard = useCallback(
    (projectId: string, boardId: string, name: string) => controller.renameBoard(projectId, boardId, name),
    [controller],
  );
  const deleteBoard = useCallback(
    (projectId: string, boardId: string) => controller.deleteBoard(projectId, boardId),
    [controller],
  );

  const createFirstProject = useCallback(() => {
    const project = createDefaultProjectFor(userId);

    setProjects((previous) => [...previous, project]);
    setActiveProjectId(project.id);
  }, [userId, setProjects]);

  return {
    remoteVersion: controller.getRemoteVersion(viewedProjectId),
    liveStatus: isMockDataSource
      ? ''
      : status === 'conflict' || status === 'error'
        ? 'Live updates paused - resolve unsaved changes'
        : liveStatus,
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
    selectBoard,
    listBoards,
    createBoard,
    renameBoard,
    deleteBoard,
    createFirstProject,
    resetDemo,
    importProject,
    renameProject,
    trashProject,
    restoreProject,
    emptyTrash,
  };
}
