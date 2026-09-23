import { translate } from '@/shared/i18n';
import type { RecoveryDraft, RecoveryStore } from './recoveryDrafts';
import { mergeProject } from './collaborationMerge';
import { canonicalJson } from '@/shared/api/canonicalJson';
import { createId } from '@/shared/lib/createId';
import type { Project, ProjectSnapshot } from '@/entities/project/types';
import { ApiError, errorMessage } from '@/shared/api/errors';
import { diffBoard, toProjectView } from './boardAdapter';
import type { WorkspaceServices } from './contracts';

export interface WorkspaceState {
  projects: Project[];
  status: 'loading' | 'saved' | 'pending' | 'saving' | 'error' | 'conflict';
  error: string;
  recoveryDrafts?: RecoveryDraft[];
}

/** Serializes writes, retaining the exact failed request for idempotent retry. */
export class WorkspaceController {
  private state: WorkspaceState = { projects: [], status: 'loading', error: '' };
  private confirmed = new Map<string, ProjectSnapshot>();
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> | undefined;
  private retryOperation: (() => Promise<void>) | undefined;
  private generation = 0;
  private syncing: Promise<void> | undefined;
  private remoteVersions = new Map<string, number>();
  private rebases = 0;
  getRemoteVersion = (id: string) => this.remoteVersions.get(id) ?? 0;

  private acceptRemote(
    previous: ProjectSnapshot,
    remote: ProjectSnapshot,
    base = toProjectView(previous),
    forceRefresh = false,
  ) {
    const local = this.state.projects.find((project) => project.id === previous.project.id);
    if (!local) return;
    const remoteView = toProjectView(remote);
    let merged = remoteView;
    let recovered = forceRefresh && canonicalJson(local) !== canonicalJson(remoteView);
    if (!forceRefresh) {
      try {
        merged = mergeProject(base, local, remoteView, remote);
      } catch (error) {
        if (!(error instanceof ApiError) || error.problem.code !== 'collaboration_conflict') throw error;
        recovered = true;
      }
    }
    if (
      (remote.project.role === 'Viewer' || remote.project.role === 'Commenter') &&
      canonicalJson(merged) !== canonicalJson(remoteView)
    )
      recovered = true;
    if (recovered) {
      // Persist a recovery copy before replacing any unsent edits with the shared state.
      // If storage is unavailable, keep the draft on screen and use the existing error UI.
      this.preserveRecovery(local);
      merged = remoteView;
    }
    if (canonicalJson(local.items) !== canonicalJson(merged.items))
      this.remoteVersions.set(local.id, this.getRemoteVersion(local.id) + 1);
    this.confirmed.set(local.id, remote);
    this.publish({
      projects: this.state.projects.map((project) => (project.id === local.id ? merged : project)),
      ...(recovered ? { error: '', status: this.running ? ('saving' as const) : ('pending' as const) } : {}),
    });
  }

  /** Background reads never reset the loading state, viewport, selection or pending draft. */
  syncProject = (id: string, signal?: AbortSignal): Promise<void> => {
    if (this.syncing) return this.syncing;
    const previous = this.confirmed.get(id);
    if (
      !previous ||
      this.running ||
      this.retryOperation ||
      previous.project.deletedAt ||
      ['loading', 'error', 'conflict'].includes(this.state.status)
    )
      return Promise.resolve();
    const generation = this.generation;
    this.syncing = (async () => {
      try {
        const remote = this.services.sync
          ? await this.services.sync(previous, signal)
          : { ...previous, board: await this.services.boards.get(id, previous.board.board.id, signal) };
        if (!remote || signal?.aborted || generation !== this.generation || this.confirmed.get(id) !== previous) return;
        if (
          BigInt(remote.board.board.revision) < BigInt(previous.board.board.revision) ||
          BigInt(remote.project.revision) < BigInt(previous.project.revision)
        )
          return;
        this.acceptRemote(previous, remote);
      } catch (error) {
        if (signal?.aborted || generation !== this.generation) return;
        if (error instanceof ApiError && error.problem.status === 409) this.report(error);
        else if (error instanceof ApiError && [403, 404].includes(error.problem.status)) {
          await this.recoverUnavailable(previous, signal);
        } else throw error;
      }
    })().finally(() => {
      this.syncing = undefined;
      if (this.state.status === 'pending' && !this.timer) this.timer = setTimeout(() => void this.flush(), 0);
    });
    return this.syncing;
  };
  private async recoverUnavailable(previous: ProjectSnapshot, signal?: AbortSignal) {
    const generation = this.generation;
    const id = previous.project.id;
    const snapshots = await this.services.projects.list(signal);
    let available = snapshots.find(
      (entry) => entry.project.id === id && !entry.project.deletedAt && !entry.project.userDeletedAt,
    );
    if (available && available.board.board.id !== previous.board.board.id) {
      try {
        available = { ...available, board: await this.services.boards.get(id, previous.board.board.id, signal) };
      } catch (error) {
        if (!(error instanceof ApiError) || ![403, 404].includes(error.problem.status)) throw error;
        // The child board was removed: the project list supplies its surviving main board.
      }
    }
    if (signal?.aborted || generation !== this.generation || this.confirmed.get(id) !== previous) return;
    if (available) {
      this.acceptRemote(previous, available, toProjectView(previous), true);
      return;
    }
    const local = this.state.projects.find((project) => project.id === id);
    if (local && canonicalJson(local) !== canonicalJson(toProjectView(previous))) this.preserveRecovery(local);
    this.confirmed.delete(id);
    this.publish({
      projects: this.state.projects.filter((project) => project.id !== id),
      status: this.running ? 'saving' : 'pending',
      error: '',
    });
  }

  private projectIds = new Map<string, string>();
  resolveProjectId = (id: string) => this.projectIds.get(id) ?? id;

  constructor(
    private readonly services: WorkspaceServices,
    private readonly recoveryStore?: RecoveryStore,
  ) {
    this.state.recoveryDrafts = recoveryStore?.load() ?? [];
  }

  private preserveRecovery(project: Project) {
    const draft: RecoveryDraft = {
      id: createId(),
      createdAt: new Date().toISOString(),
      project: structuredClone(project),
    };
    this.recoveryStore?.save(draft);
    this.publish({ recoveryDrafts: [...(this.state.recoveryDrafts ?? []), draft] });
  }

  clearRecoveryDrafts = () => {
    for (const draft of this.state.recoveryDrafts ?? []) this.recoveryStore?.remove(draft.id);
    this.publish({ recoveryDrafts: [] });
  };

  addImportedProject(snapshot: ProjectSnapshot) {
    this.confirmed.set(snapshot.project.id, snapshot);
    this.publish({ projects: [...this.state.projects, toProjectView(snapshot)] });
  }

  async purgeProject(id: string) {
    const previous = this.confirmed.get(id);
    if (!previous?.project.deletedAt) throw new Error(translate('Only trashed projects can be deleted permanently.'));
    await this.services.projects.purge(id, previous.project.revision, createId());
    this.confirmed.delete(id);
    this.publish({ projects: this.state.projects.filter((project) => project.id !== id) });
  }

  async saveComments(projectId: string, itemId: string, comments: import('@/entities/board/types').ItemComment[]) {
    await this.flush();
    if (this.state.status !== 'saved') throw new Error(translate('Resolve pending changes before commenting.'));
    const previous = this.confirmed.get(projectId);
    if (!previous) throw new Error(translate('Project is unavailable.'));
    const before = previous.board.comments.filter((comment) => comment.itemId === itemId && !comment.deletedAt);
    const upserts = comments
      .filter(
        (comment) =>
          !before.some(
            (old) => old.id === comment.id && old.text === comment.text && old.status === (comment.status ?? 'open'),
          ),
      )
      .map((comment) => ({ id: comment.id, text: comment.text, status: comment.status ?? 'open' }));
    const deletes = before
      .filter((old) => !comments.some((comment) => comment.id === old.id))
      .map((comment) => comment.id);
    if (!upserts.length && !deletes.length) return;
    let latest = previous;
    for (let attempt = 0; ; attempt++) {
      try {
        const board = await this.services.boards.saveComments(projectId, latest.board.board.id, itemId, {
          expectedBoardRevision: latest.board.board.revision,
          upserts,
          deletes,
        });
        // A board switch during the request must not bring the previous board back.
        if (this.confirmed.get(projectId)?.board.board.id === board.board.id)
          this.acceptRemote(previous, { ...latest, board });
        return;
      } catch (error) {
        if (
          !(error instanceof ApiError) ||
          error.problem.status !== 409 ||
          !['revision_mismatch', 'revision_conflict', 'http_error'].includes(error.problem.code)
        )
          throw error;
        const board = await this.services.boards.get(projectId, latest.board.board.id);
        latest = { ...latest, board };
        const oldComments = new Map(before.map((comment) => [comment.id, comment]));
        const remoteComments = new Map(
          board.comments.filter((comment) => !comment.deletedAt).map((comment) => [comment.id, comment]),
        );
        const content = (comment: { text: string; status?: string } | undefined) =>
          comment && { text: comment.text, status: comment.status ?? 'open' };
        const overlapping = [...upserts.map((comment) => comment.id), ...deletes].some((id) => {
          const remote = content(remoteComments.get(id));
          return (
            canonicalJson(content(oldComments.get(id))) !== canonicalJson(remote) &&
            canonicalJson(content(upserts.find((comment) => comment.id === id))) !== canonicalJson(remote)
          );
        });
        if (overlapping || attempt >= 2 || !board.items.some((item) => item.id === itemId && !item.deletedAt)) {
          const withComments = (items: Project['items']): Project['items'] =>
            items.map((item) => {
              if (item.id === itemId) return { ...item, comments };
              return item.type === 'column' ? { ...item, items: withComments(item.items) } : item;
            });
          const draft = toProjectView(previous);
          this.preserveRecovery({ ...draft, items: withComments(draft.items) });
          if (this.confirmed.get(projectId)?.board.board.id === board.board.id) this.acceptRemote(previous, latest);
          return;
        }
      }
    }
  }

  async listBoards(projectId: string, signal?: AbortSignal) {
    return this.services.boards.list(projectId, signal);
  }

  async createBoard(projectId: string, name: string) {
    return this.services.boards.create(projectId, name);
  }

  async renameBoard(projectId: string, boardId: string, name: string) {
    return this.services.boards.rename(projectId, boardId, name);
  }

  async deleteBoard(projectId: string, boardId: string) {
    return this.services.boards.delete(projectId, boardId);
  }

  async listItemTrash(projectId: string) {
    await this.flush();
    return this.services.boards.listTrash(projectId);
  }

  async restoreTrashItem(
    projectId: string,
    itemId: string,
    targetBoardId: string,
    position?: { x: number; y: number },
  ) {
    await this.flush();
    const board = await this.services.boards.restoreTrashItem(projectId, itemId, targetBoardId, position);
    const previous = this.confirmed.get(projectId);
    if (previous?.board.board.id === board.board.id) {
      const next = { ...previous, board };
      this.confirmed.set(projectId, next);
      this.publish({
        projects: this.state.projects.map((project) => (project.id === projectId ? toProjectView(next) : project)),
        status: 'saved',
        error: '',
      });
    }
    return board;
  }

  async purgeTrashItem(projectId: string, itemId: string) {
    await this.flush();
    await this.services.boards.purgeTrashItem(projectId, itemId);
    await this.refreshCurrentBoard(projectId);
  }

  async emptyItemTrash(projectId: string) {
    await this.flush();
    await this.services.boards.emptyTrash(projectId);
    await this.refreshCurrentBoard(projectId);
  }

  private async refreshCurrentBoard(projectId: string) {
    const previous = this.confirmed.get(projectId);
    if (!previous) return;
    const boards = await this.services.boards.list(projectId);
    const current =
      boards.find((board) => board.id === previous.board.board.id && !board.deletedAt) ??
      boards.find((board) => !board.deletedAt);
    if (!current) return;
    if (current.id !== previous.board.board.id) {
      await this.switchBoard(projectId, current.id);
      return;
    }
    const board = await this.services.boards.get(projectId, current.id);
    if (board.board.revision !== previous.board.board.revision) this.acceptRemote(previous, { ...previous, board });
  }

  async switchBoard(projectId: string, boardId: string): Promise<void> {
    await this.flush();
    if (this.state.status !== 'saved') throw new Error(translate('Save pending changes before switching boards.'));
    const previous = this.confirmed.get(projectId);
    if (!previous || previous.board.board.id === boardId) return;
    const board = await this.services.boards.get(projectId, boardId);
    if (board.board.projectId !== projectId) throw new Error(translate('Board belongs to another project.'));
    const next = { ...previous, board };
    this.confirmed.set(projectId, next);
    this.publish({
      projects: this.state.projects.map((project) => (project.id === projectId ? toProjectView(next) : project)),
      status: 'saved',
      error: '',
    });
  }

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<WorkspaceState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  async load(signal?: AbortSignal): Promise<void> {
    const generation = ++this.generation;
    this.publish({ status: 'loading', error: '' });
    try {
      const snapshots = await this.services.projects.list(signal);
      if (signal?.aborted || generation !== this.generation) return;
      const projects = snapshots.map(toProjectView);
      this.confirmed = new Map(snapshots.map((s) => [s.project.id, s]));
      this.retryOperation = undefined;
      this.publish({ projects, status: 'saved' });
    } catch (error) {
      if (!signal?.aborted && generation === this.generation) this.report(error);
    }
  }

  update = (action: Project[] | ((previous: Project[]) => Project[])) => {
    if (this.state.status === 'loading') return;
    const next = typeof action === 'function' ? action(this.state.projects) : action;
    for (const previous of this.state.projects) {
      const role = this.confirmed.get(previous.id)?.project.role;
      const desired = next.find((project) => project.id === previous.id);
      if (!role || role === 'Owner') continue;
      if (
        !desired ||
        desired.deletedAt !== previous.deletedAt ||
        ((role === 'Viewer' || role === 'Commenter') && JSON.stringify(desired) !== JSON.stringify(previous))
      ) {
        return;
      }
    }
    const projects = next.map((project) =>
      project.name === project.name.trim() ? project : { ...project, name: project.name.trim() },
    );
    if (projects === this.state.projects) return;
    const blocked = this.state.status === 'error' || this.state.status === 'conflict';
    this.publish({ projects, ...(blocked ? {} : { status: 'pending' }) });
    // Batch from the first edit; continuous typing must not postpone saving forever.
    if (!blocked && !this.timer)
      this.timer = setTimeout(() => {
        void this.flush();
      }, 250);
  };

  private report(error: unknown) {
    this.publish({
      status: error instanceof ApiError && error.problem.status === 409 ? 'conflict' : 'error',
      error: errorMessage(error),
    });
  }

  flush = (): Promise<void> => {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (this.running) return this.running;
    if (this.syncing) return this.syncing.catch(() => {}).then(() => this.flush());
    if (this.state.status === 'loading' || this.state.status === 'error' || this.state.status === 'conflict')
      return Promise.resolve();
    this.running = this.drain().finally(() => {
      this.running = undefined;
    });
    return this.running;
  };

  retry = async (): Promise<void> => {
    if (!this.confirmed.size && !this.state.projects.length) return this.load();
    if (this.state.status === 'conflict') return;
    this.publish({ status: 'pending', error: '' });
    await this.flush();
  };

  discardForReset = async (): Promise<void> => {
    clearTimeout(this.timer);
    this.timer = undefined;
    await this.running;
    clearTimeout(this.timer);
    this.timer = undefined;
    ++this.generation;
    this.retryOperation = undefined;
    this.publish({ status: 'saved', error: '' });
  };

  private async drain() {
    this.rebases = 0;
    this.publish({ status: 'saving', error: '' });
    try {
      while (true) {
        const operation = this.retryOperation ?? this.nextOperation();
        if (!operation) break;
        this.retryOperation = operation;
        await operation();
        this.retryOperation = undefined;
      }
      this.publish({ status: 'saved' });
    } catch (error) {
      this.report(error);
    }
  }

  private nextOperation(): (() => Promise<void>) | undefined {
    for (const desired of this.state.projects) {
      const previous = this.confirmed.get(desired.id);
      if (!previous) {
        const input = { id: desired.id, name: desired.name, color: desired.color, clientMutationId: createId() };
        return async () => {
          const snapshot = await this.services.projects.create(input);
          this.confirmed.set(snapshot.project.id, snapshot);
          if (snapshot.project.id !== desired.id) {
            this.projectIds.set(desired.id, snapshot.project.id);
            this.publish({
              projects: this.state.projects.map((project) =>
                project.id === desired.id
                  ? { ...project, id: snapshot.project.id, ownerId: snapshot.project.ownerId }
                  : project,
              ),
            });
          }
        };
      }
      // Restore before item changes; trash only after the last board edit is saved.
      const metadataChanged =
        previous.project.name !== desired.name ||
        previous.project.color !== desired.color ||
        Boolean(previous.project.deletedAt) !== Boolean(desired.deletedAt);
      const boardMutation = diffBoard(previous.board, desired.items);
      if (metadataChanged && (previous.project.deletedAt || !boardMutation)) {
        const input = {
          name: desired.name,
          color: desired.color,
          deletedAt: desired.deletedAt ?? null,
          expectedRevision: previous.project.revision,
          clientMutationId: createId(),
        };
        return async () => {
          try {
            previous.project = await this.services.projects.update(desired.id, input);
            if (previous.board.board.id === previous.project.id && !previous.project.deletedAt) {
              const boards = await this.services.boards.list(desired.id);
              const first = boards.find((board) => !board.deletedAt);
              if (!first) throw new Error(translate('Restored project has no active board.'));
              const board = await this.services.boards.get(desired.id, first.id);
              this.acceptRemote(previous, { ...previous, board });
            }
          } catch (error) {
            if (error instanceof ApiError && [403, 404].includes(error.problem.status)) {
              await this.recoverUnavailable(previous);
              return;
            }
            if (
              !(error instanceof ApiError) ||
              error.problem.status !== 409 ||
              !['revision_mismatch', 'revision_conflict', 'http_error'].includes(error.problem.code) ||
              !this.services.sync
            )
              throw error;
            const remote = await this.services.sync(previous);
            if (!remote) throw error;
            this.acceptRemote(previous, remote, toProjectView(previous), ++this.rebases > 3);
          }
        };
      }
      if (boardMutation)
        return async () => {
          let board;
          try {
            board = await retryTransient(() =>
              this.services.boards.mutate(desired.id, previous.board.board.id, boardMutation),
            );
          } catch (error) {
            if (error instanceof ApiError && [403, 404].includes(error.problem.status)) {
              await this.recoverUnavailable(previous);
              return;
            }
            if (
              !(error instanceof ApiError) ||
              error.problem.status !== 409 ||
              !['revision_mismatch', 'revision_conflict', 'http_error', 'presence_locked'].includes(error.problem.code)
            )
              throw error;
            // A rejected revision has not committed. Rebase independent edits and mint a new mutation ID.
            const remote = await this.services.boards.get(desired.id, previous.board.board.id);
            this.acceptRemote(
              previous,
              { ...previous, board: remote },
              toProjectView(previous),
              error.problem.code === 'presence_locked' || ++this.rebases > 3,
            );
            return;
          }
          if (BigInt(board.board.revision) < BigInt(previous.board.board.revision))
            throw new Error(translate('Stale board response'));
          // The follow-up snapshot may already contain another collaborator's commit.
          // Preserve edits made while our own request was in flight as well.
          this.acceptRemote(
            previous,
            { ...previous, board },
            { ...desired, ...toProjectView(previous), items: desired.items },
          );
        };
    }
    for (const [id, previous] of this.confirmed) {
      if (this.state.projects.some((p) => p.id === id)) continue;
      const mutationId = createId();
      if (!previous.project.deletedAt) {
        const input = {
          name: previous.project.name,
          color: previous.project.color,
          deletedAt: new Date().toISOString(),
          expectedRevision: previous.project.revision,
          clientMutationId: mutationId,
        };
        return async () => {
          previous.project = await this.services.projects.update(id, input);
        };
      }
      return async () => {
        await this.services.projects.purge(id, previous.project.revision, mutationId);
        this.confirmed.delete(id);
      };
    }
    return undefined;
  }
}

async function retryTransient<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const transient =
        error instanceof TypeError ||
        (error instanceof DOMException && ['TimeoutError', 'NetworkError'].includes(error.name)) ||
        (error instanceof ApiError && [429, 502, 503, 504].includes(error.problem.status));
      if (!transient || attempt >= 2) throw error;
      const delay =
        error instanceof ApiError && error.problem.status === 429
          ? Math.min(60000, Math.max(300, error.problem.retryAfterMs ?? 1000))
          : 300 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
