import { useEffect, useState } from 'react';
import { publicApi } from '@/app/services';
import type { PublicBoardSnapshot, PublicProjectSnapshot, PublicProjectView } from '@/entities/project/shareTypes';
import { toPublicProjectView } from '../services/publicBoardAdapter';
import { ApiError, errorMessage } from '@/shared/api/errors';
import { PublicAppearanceProvider } from '@/app/providers/ThemeProvider';
import ReadOnlyBoard from './ReadOnlyBoard';

export default function PublicProjectPage({ token }: { token: string }) {
  const [snapshot, setSnapshot] = useState<PublicProjectSnapshot | null>(null);
  const [boardId, setBoardId] = useState('');
  const [view, setView] = useState<{
    project: PublicProjectView;
    appearance: PublicBoardSnapshot['appearance'];
  } | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [liveStatus, setLiveStatus] = useState('Live updates on');
  useEffect(() => {
    let active = true;
    void publicApi
      .getProject(token)
      .then((value) => {
        if (!active) return;
        setSnapshot(value);
        setBoardId([...value.boards].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.id ?? '');
      })
      .catch((reason) => {
        if (active) setError(message(reason));
      });
    return () => {
      active = false;
    };
  }, [token, attempt]);
  useEffect(() => {
    if (!boardId) return;
    let active = true;
    let running = false;
    let failures = 0;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      if (!active || running || stopped) return;
      clearTimeout(timer);
      if (document.hidden) {
        timer = setTimeout(() => void refresh(), 3000);
        return;
      }
      running = true;
      try {
        const value = await publicApi.getBoard(token, boardId);
        const project = toPublicProjectView(value);
        if (active) {
          setView((previous) =>
            JSON.stringify(previous?.project) === JSON.stringify(project) &&
            JSON.stringify(previous?.appearance) === JSON.stringify(value.appearance)
              ? previous
              : { project, appearance: value.appearance },
          );
          setSnapshot((previous) => (previous ? { ...previous, project: value.project } : previous));
          setError('');
          setLiveStatus('Live updates on');
          failures = 0;
        }
      } catch (reason) {
        if (active) {
          if (reason instanceof ApiError && reason.problem.status === 404) {
            stopped = true;
            setView(null);
            setError(message(reason));
          } else {
            failures++;
            setLiveStatus('Live updates reconnecting...');
          }
        }
      } finally {
        running = false;
        if (active && !stopped) timer = setTimeout(() => void refresh(), Math.min(60000, 3000 * 2 ** failures));
      }
    };
    const wake = () => {
      if (!document.hidden) void refresh();
    };
    void refresh();
    window.addEventListener('online', wake);
    document.addEventListener('visibilitychange', wake);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener('online', wake);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [token, boardId, attempt]);
  return (
    <div
      className="flex h-dvh flex-col"
      style={{ color: 'var(--color-text-primary)', background: 'var(--color-app-bg)' }}
    >
      <meta name="referrer" content="no-referrer" />
      <header className="flex flex-wrap items-center gap-4 p-4 border-b">
        <a href={import.meta.env.BASE_URL}>NodexMesh</a>
        <h1 className="font-semibold">{snapshot?.project.name ?? 'Shared project'}</h1>
        <span>Public / Read-only</span>
        <span className="text-xs" role="status">
          {liveStatus}
        </span>
        {snapshot && snapshot.boards.length > 1 && (
          <select
            aria-label="Board"
            value={boardId}
            onChange={(event) => {
              setView(null);
              setError('');
              setBoardId(event.target.value);
            }}
          >
            {snapshot.boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>
        )}
      </header>
      {error ? (
        <div className="p-8" role="alert">
          <p>{error}</p>
          <button
            onClick={() => {
              setError('');
              setView(null);
              setSnapshot(null);
              setBoardId('');
              setAttempt(attempt + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : view ? (
        <PublicAppearanceProvider appearance={view.appearance}>
          <ReadOnlyBoard key={boardId} items={view.project.items} />
        </PublicAppearanceProvider>
      ) : (
        <p className="p-8" role="status">
          {snapshot && !snapshot.boards.length ? 'This project has no boards.' : 'Loading shared project...'}
        </p>
      )}
    </div>
  );
}
function message(error: unknown) {
  return error instanceof ApiError && error.problem.status === 404
    ? 'This link is no longer available.'
    : errorMessage(error);
}
