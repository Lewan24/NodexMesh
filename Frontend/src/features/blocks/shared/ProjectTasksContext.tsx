import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { TaskCategory } from '@/entities/board/types';
import type { ProjectParticipant } from '@/entities/project/shareTypes';
import { translate } from '@/shared/i18n';
import { httpClient } from '@/app/services';

const defaults: TaskCategory[] = [
  { id: 'important', name: 'Important', color: '#EF4444' },
  { id: 'medium', name: 'Medium priority', color: '#EAB308' },
  { id: 'low', name: 'Low priority', color: '#22C55E' },
];
const Context = createContext({
  categories: defaults,
  participants: [] as ProjectParticipant[],
  readOnly: true,
  categoriesReady: true,
  categoriesError: '',
  reloadCategories: async (): Promise<void> => {},
  saveCategories: async (_categories: TaskCategory[]): Promise<void> => {
    throw new Error('Project categories unavailable');
  },
});
export const useProjectTasks = () => useContext(Context);
interface Response {
  revision: string;
  categories: TaskCategory[];
}
export function ProjectTasksProvider({
  projectId,
  participants,
  readOnly,
  children,
}: {
  projectId: string;
  participants: ProjectParticipant[];
  readOnly: boolean;
  children: ReactNode;
}) {
  const [state, setState] = useState<Response>({ revision: '0', categories: defaults });
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    let active = true;
    setLoaded(!projectId);
    setLoadError('');
    setState({ revision: '0', categories: defaults });
    if (projectId && httpClient)
      void httpClient
        .request(`/projects/${encodeURIComponent(projectId)}/task-categories`)
        .then((value) => {
          if (active) {
            setState(value as Response);
            setLoaded(true);
          }
        })
        .catch(() => {
          if (active) setLoadError(translate('Could not load project categories.'));
        });
    return () => {
      active = false;
    };
  }, [projectId]);
  const reloadCategories = async () => {
    if (!projectId || !httpClient) return;
    setLoadError('');
    try {
      const latest = await httpClient.request(`/projects/${encodeURIComponent(projectId)}/task-categories`);
      setState(latest as Response);
      setLoaded(true);
    } catch {
      setLoadError(translate('Could not load project categories.'));
    }
  };
  const saveCategories = async (categories: TaskCategory[]) => {
    if (readOnly || !loaded) throw new Error(translate('Reload the project categories before editing.'));
    if (projectId && httpClient) {
      try {
        const value = await httpClient.request(`/projects/${encodeURIComponent(projectId)}/task-categories`, {
          method: 'PUT',
          body: { expectedRevision: state.revision, categories },
        });
        setState(value as Response);
      } catch (error) {
        // Refresh the revision after a conflict so the user can review and retry.
        await reloadCategories();
        throw error;
      }
    } else setState({ ...state, categories });
  };
  return (
    <Context.Provider
      value={{
        categories: state.categories,
        participants,
        readOnly,
        saveCategories,
        categoriesReady: loaded,
        categoriesError: loadError,
        reloadCategories,
      }}
    >
      {children}
    </Context.Provider>
  );
}
