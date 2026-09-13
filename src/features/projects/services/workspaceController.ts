import type { Project, ProjectSnapshot } from '@/entities/project/types';
import { ApiError, errorMessage } from '@/shared/api/errors';
import { diffBoard, toProjectView } from './boardAdapter';
import type { WorkspaceServices } from './contracts';

export interface WorkspaceState {
  projects: Project[];
  status: 'loading' | 'saved' | 'pending' | 'saving' | 'error' | 'conflict';
  error: string;
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

  constructor(private readonly services: WorkspaceServices) {}

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
    const projects = next.map((project) => project.name === project.name.trim() ? project : { ...project, name: project.name.trim() });
    if (projects === this.state.projects) return;
    const blocked = this.state.status === 'error' || this.state.status === 'conflict';
    this.publish({ projects, ...(blocked ? {} : { status: 'pending' }) });
    clearTimeout(this.timer);
    if (!blocked)
      this.timer = setTimeout(() => {
        void this.flush();
      }, 500);
  };

  private report(error: unknown) {
    this.publish({
      status: error instanceof ApiError && error.problem.status === 409 ? 'conflict' : 'error',
      error: errorMessage(error),
    });
  }

  flush = (): Promise<void> => {
    clearTimeout(this.timer);
    if (this.running) return this.running;
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

  private async drain() {
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
        const input = {
          id: desired.id,
          name: desired.name,
          color: desired.color,
          clientMutationId: crypto.randomUUID(),
        };
        return async () => {
          this.confirmed.set(desired.id, await this.services.projects.create(input));
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
          clientMutationId: crypto.randomUUID(),
        };
        return async () => {
          previous.project = await this.services.projects.update(desired.id, input);
        };
      }
      if (boardMutation)
        return async () => {
          const board = await this.services.boards.mutate(desired.id, previous.board.board.id, boardMutation);
          if (BigInt(board.board.revision) < BigInt(previous.board.board.revision))
            throw new Error('Stale board response');
          previous.board = board;
        };
    }
    for (const [id, previous] of this.confirmed) {
      if (this.state.projects.some((p) => p.id === id)) continue;
      const mutationId = crypto.randomUUID();
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
