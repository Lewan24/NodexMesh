import {
  useCallback,
  useState,
} from 'react';

interface PendingDelete {
  execute: () => void;
  count: number;
}

interface UseDeleteConfirmationOptions {
  pushHistory: () => void;
}

export function useDeleteConfirmation({
  pushHistory,
}: UseDeleteConfirmationOptions) {
  const [
    pendingDelete,
    setPendingDelete,
  ] =
    useState<PendingDelete | null>(
      null,
    );

  const requestDelete =
    useCallback(
      (
        execute: () => void,
        count = 1,
      ) => {
        setPendingDelete({
          execute,
          count,
        });
      },
      [],
    );

  const confirmDelete =
    useCallback(() => {
      setPendingDelete(
        previous => {
          if (!previous) {
            return null;
          }

          pushHistory();
          previous.execute();

          return null;
        },
      );
    }, [pushHistory]);

  const cancelDelete =
    useCallback(() => {
      setPendingDelete(null);
    }, []);

  return {
    pendingDelete,
    requestDelete,
    confirmDelete,
    cancelDelete,
  };
}