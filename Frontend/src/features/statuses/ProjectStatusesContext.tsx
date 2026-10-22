import { translate } from '@/shared/i18n';
import { createContext, useContext, useEffect, useRef, useState, useMemo, type ReactNode } from 'react';
import { createWorkspaceServices } from '@/app/services';
import type { ProjectStatus } from './types';
import { validateStatuses } from './statusModel';

interface StatusState {
  revision: string;
  statuses: ProjectStatus[];
}
interface StatusContextValue {
  statuses: ProjectStatus[];
  readOnly: boolean;
  ready: boolean;
  error: string;
  reload: () => Promise<void>;
  save: (statuses: ProjectStatus[]) => Promise<void>;
}
const empty: StatusContextValue = {
  statuses: [],
  readOnly: true,
  ready: true,
  error: '',
  reload: async () => {},
  save: async () => {
    throw new Error(translate('Project statuses unavailable.'));
  },
};
const Context = createContext<StatusContextValue>(empty);
const Definitions = createContext<ProjectStatus[]>([]);
export const useStatusDefinitions = () => useContext(Definitions);
export const useProjectStatuses = () => useContext(Context);
export function PublicStatusesProvider({ statuses, children }: { statuses: ProjectStatus[]; children: ReactNode }) {
  return (
    <Definitions value={statuses}>
      <Context value={{ ...empty, statuses }}>{children}</Context>
    </Definitions>
  );
}

export function ProjectStatusesProvider({
  projectId,
  userId,
  readOnly,
  children,
}: {
  projectId: string;
  userId: string;
  readOnly: boolean;
  children: ReactNode;
}) {
  const [state, setState] = useState<StatusState>({ revision: '0', statuses: [] });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const stateRef = useRef(state);
  const generation = useRef(0);
  const active = useRef(true);
  const saving = useRef(false);
  const repository = useMemo(() => createWorkspaceServices(userId).statuses!, [userId]);
  const apply = (value: unknown) => {
    const next = value as StatusState;
    if (!next || typeof next.revision !== 'string' || !/^\d+$/.test(next.revision))
      throw new Error(translate('Invalid project statuses response.'));
    validateStatuses(next.statuses);
    if (JSON.stringify(next.statuses) === JSON.stringify(stateRef.current.statuses))
      next.statuses = stateRef.current.statuses;
    stateRef.current = next;
    setState(next);
    setReady(true);
    setError('');
  };
  const reload = async () => {
    if (saving.current) return;
    const request = ++generation.current;
    try {
      const value = await repository.get(projectId);
      if (active.current && request === generation.current) apply(value);
    } catch (cause) {
      if (active.current && request === generation.current)
        setError(cause instanceof Error ? cause.message : translate('Could not load project statuses.'));
    }
  };
  const latestReload = useRef(reload);
  latestReload.current = reload;
  useEffect(() => {
    active.current = true;
    void latestReload.current();
    const wake = () => {
      if (!document.hidden) void latestReload.current();
    };
    const timer = window.setInterval(wake, 15000);
    window.addEventListener('focus', wake);
    window.addEventListener('storage', wake);
    return () => {
      active.current = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', wake);
      window.removeEventListener('storage', wake);
    };
  }, [projectId, repository]);
  const save = async (statuses: ProjectStatus[]) => {
    if (readOnly || !ready || saving.current)
      throw new Error(translate('Project statuses are unavailable for editing.'));
    validateStatuses(statuses);
    saving.current = true;
    ++generation.current;
    try {
      const value = await repository.save(projectId, stateRef.current.revision, statuses);
      if (active.current) apply(value);
    } catch (cause) {
      saving.current = false;
      await reload();
      throw cause;
    } finally {
      saving.current = false;
    }
  };
  return (
    <Definitions value={state.statuses}>
      <Context value={{ statuses: state.statuses, readOnly, ready, error, reload, save }}>{children}</Context>
    </Definitions>
  );
}
