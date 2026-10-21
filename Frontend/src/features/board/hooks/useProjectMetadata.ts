import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import { toast } from 'sonner';
import { translate } from '@/shared/i18n';
import type { BoardRecord } from '@/entities/board/records';
import type { ProjectParticipant } from '@/entities/project/shareTypes';

interface Options {
  projectId?: string;
  remoteVersion: number;
  participantsRevision: number;
  listBoards: (projectId: string, signal?: AbortSignal) => Promise<BoardRecord[]>;
  participants?: (projectId: string, signal?: AbortSignal) => Promise<ProjectParticipant[]>;
}

export function useProjectMetadata({
  projectId,
  remoteVersion,
  participantsRevision,
  listBoards,
  participants,
}: Options) {
  const [boardState, setBoardState] = useState<{ projectId?: string; boards: BoardRecord[] }>({
    projectId,
    boards: [],
  });
  const [participantState, setParticipantState] = useState<{ projectId?: string; values: ProjectParticipant[] }>({
    projectId,
    values: [],
  });

  const setBoards = useCallback(
    (update: SetStateAction<BoardRecord[]>) => {
      setBoardState((current) =>
        current.projectId !== projectId
          ? current
          : { projectId, boards: typeof update === 'function' ? update(current.boards) : update },
      );
    },
    [projectId],
  );

  useEffect(() => {
    setBoardState((current) => (current.projectId === projectId ? current : { projectId, boards: [] }));
    if (!projectId) return;
    const abort = new AbortController();
    void listBoards(projectId, abort.signal)
      .then((boards) => {
        if (!abort.signal.aborted) setBoardState({ projectId, boards });
      })
      .catch(() => {
        if (!abort.signal.aborted) toast.error(translate('Could not load the project boards.'));
      });
    return () => abort.abort();
  }, [projectId, listBoards, remoteVersion]);

  useEffect(() => {
    setParticipantState((current) => (current.projectId === projectId ? current : { projectId, values: [] }));
    if (!projectId || !participants) return;
    const abort = new AbortController();
    void participants(projectId, abort.signal)
      .then((values) => {
        if (!abort.signal.aborted) setParticipantState({ projectId, values });
      })
      .catch(() => {
        if (!abort.signal.aborted) setParticipantState({ projectId, values: [] });
      });
    return () => abort.abort();
  }, [projectId, participants, remoteVersion, participantsRevision]);

  return {
    boards: boardState.projectId === projectId ? boardState.boards : [],
    setBoards,
    projectParticipants: participantState.projectId === projectId ? participantState.values : [],
  };
}
