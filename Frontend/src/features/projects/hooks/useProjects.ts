import { translate } from '@/shared/i18n';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import type { Project } from '@/entities/project/types';
import { createDefaultProjectFor } from '@/entities/project/projectFactory';

import { createWorkspaceServices, httpClient, isMockDataSource } from '@/app/services';
import { importProjectJson, exportWorkspaceProject, persistImportedProject } from '../services/projectJson';
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
  saveComments: (
    projectId: string,
    itemId: string,
    comments: import('@/entities/board/types').ItemComment[],
  ) => Promise<void>;
  listBoards: (projectId: string) => Promise<import('@/entities/board/records').BoardRecord[]>;
  createBoard: (projectId: string, name: string) => Promise<import('@/entities/board/records').BoardSnapshot>;
  renameBoard: (
    projectId: string,
    boardId: string,
    name: string,
  ) => Promise<import('@/entities/board/records').BoardRecord>;
  deleteBoard: (projectId: string, boardId: string) => Promise<void>;
  listItemTrash: (projectId: string) => Promise<import('@/entities/board/records').TrashedItemRecord[]>;
  restoreTrashItem: (
    projectId: string,
    itemId: string,
    targetBoardId: string,
    position?: { x: number; y: number },
  ) => Promise<import('@/entities/board/records').BoardSnapshot>;
  purgeTrashItem: (projectId: string, itemId: string) => Promise<void>;
  emptyItemTrash: (projectId: string) => Promise<void>;
  createFirstProject: () => void;
  resetDemo: () => void;
  importProject: (text: string) => Promise<void>;
  renameProject: (id: string, name: string) => void;
  trashProject: (id: string) => void;
  emptyTrash: () => Promise<void>;
  purgeProject: (id: string) => Promise<void>;
  exportProject: () => Promise<string>;
  defaultProjectId: string;
  setDefaultProject: (id: string) => Promise<void>;
  restoreProject: (id: string) => void;
}

export function useProjects(userId: string): UseProjectsResult {
  const [controller] = useState(() => new WorkspaceController(createWorkspaceServices(userId)));
  const { projects, status, error } = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const setProjects = controller.update;

  const [defaultProjectId, setDefaultProjectId] = useState('');
  const [activeProjectId, setActiveProjectId] = useState<string>(
    () => projects.find((project) => !project.deletedAt)?.id ?? '',
  );

  useEffect(() => {
    const abort = new AbortController();
    void (async () => {
      try {
        const preference = httpClient
          ? ((await httpClient.request('/auth/default-project', { signal: abort.signal })) as {
              projectId: string | null;
            })
          : { projectId: localStorage.getItem(`nodexmesh.default-project.${userId}`) };
        if (!abort.signal.aborted) {
          setDefaultProjectId(preference.projectId ?? '');
          setActiveProjectId(preference.projectId ?? '');
        }
      } catch {
        if (!abort.signal.aborted) toast.error(translate('Could not load your default project.'));
      }
      if (!abort.signal.aborted) await controller.load(abort.signal);
    })();
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

  const removeProjects = async (ids: string[]) => {
    await controller.flush();
    if (controller.getSnapshot().status !== 'saved')
      throw new Error(translate('Save pending changes before deleting projects.'));
    for (const id of ids) await controller.purgeProject(id);
  };
  const purgeProject = (id: string) => removeProjects([id]);
  const emptyTrash = () =>
    removeProjects(
      projects
        .filter((project) => project.deletedAt && (!project.role || project.role === 'Owner'))
        .map((project) => project.id),
    );
  const setDefaultProject = async (id: string) => {
    await controller.flush();
    if (controller.getSnapshot().status !== 'saved')
      throw new Error(translate('Save the project before setting it as default.'));
    id = controller.resolveProjectId(id);
    if (httpClient)
      await httpClient.request('/auth/default-project', { method: 'PUT', body: { projectId: id || null } });
    else localStorage.setItem(`nodexmesh.default-project.${userId}`, id);
    setDefaultProjectId(id);
  };
  const exportProject = async () => {
    await controller.flush();
    if (controller.getSnapshot().status !== 'saved')
      throw new Error(translate('Save pending changes before exporting.'));
    if (!activeProject) throw new Error(translate('Select a project to export.'));
    return exportWorkspaceProject(createWorkspaceServices(userId), controller.resolveProjectId(activeProject.id));
  };

  const resetDemo = useCallback(() => {
    if (isMockDataSource) {
      void controller
        .discardForReset()
        .then(() => {
          localStorage.clear();
          window.location.reload();
        })
        .catch(() => toast.error(translate('Could not clear browser storage.')));
      return;
    }
    toast.error(translate('Demo reset is only available in mock mode.'));
  }, [controller]);

  const importProject = async (text: string) => {
    const project = await importProjectJson(text, userId);
    await controller.flush();
    if (controller.getSnapshot().status !== 'saved')
      throw new Error(translate('Save pending changes before importing.'));
    const snapshot = await persistImportedProject(createWorkspaceServices(userId), project);
    controller.addImportedProject(snapshot);
    setActiveProjectId(snapshot.project.id);
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
  const listItemTrash = useCallback((projectId: string) => controller.listItemTrash(projectId), [controller]);
  const restoreTrashItem = useCallback(
    (projectId: string, itemId: string, targetBoardId: string, position?: { x: number; y: number }) =>
      controller.restoreTrashItem(projectId, itemId, targetBoardId, position),
    [controller],
  );
  const purgeTrashItem = useCallback(
    (projectId: string, itemId: string) => controller.purgeTrashItem(projectId, itemId),
    [controller],
  );
  const emptyItemTrash = useCallback((projectId: string) => controller.emptyItemTrash(projectId), [controller]);

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
        ? translate('Live updates paused - resolve unsaved changes')
        : translate(liveStatus),
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
    saveComments: (projectId, itemId, comments) => controller.saveComments(projectId, itemId, comments),
    createBoard,
    renameBoard,
    deleteBoard,
    listItemTrash,
    restoreTrashItem,
    purgeTrashItem,
    emptyItemTrash,
    createFirstProject,
    resetDemo,
    importProject,
    renameProject,
    trashProject,
    restoreProject,
    emptyTrash,
    purgeProject,
    exportProject,
    defaultProjectId,
    setDefaultProject,
  };
}
