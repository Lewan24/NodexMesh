import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface RemotePresence {
  userId: string;
  displayName: string;
  itemIds: string[];
  mode: 'selected' | 'editing';
  expiresAt: string;
}

interface PresenceEvent extends RemotePresence {
  projectId: string;
  boardId: string;
}

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const hubUrl = `${baseUrl.replace(/\/api\/v1\/?$/, '')}/hubs/collaboration`;

export function useCollaborationPresence(
  projectId: string,
  boardId: string | undefined,
  userId: string,
  selectedIds: string[],
  getAccessToken?: () => string,
) {
  const [remote, setRemote] = useState<Record<string, RemotePresence>>({});
  const connection = useRef<HubConnection | undefined>(undefined);
  const selectedRef = useRef(selectedIds);
  selectedRef.current = selectedIds;
  const identity = `${projectId}:${boardId ?? ''}:${userId}`;

  useEffect(() => {
    if (!projectId || !boardId || !userId) return;
    let disposed = false;
    const next = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: async () => {
          return getAccessToken?.() ?? '';
        },
        withCredentials: true,
      })
      .withAutomaticReconnect([0, 1000, 3000, 10000])
      .configureLogging(import.meta.env.DEV ? LogLevel.Warning : LogLevel.Error)
      .build();
    connection.current = next;
    const onPresence = (value: PresenceEvent) => {
      if (value.projectId !== projectId || value.boardId !== boardId || value.userId === userId) return;
      setRemote((current) => ({ ...current, [value.userId]: value }));
    };
    const onCleared = (clearedUserId: string) => {
      setRemote((current) => {
        if (!(clearedUserId in current)) return current;
        const copy = { ...current };
        delete copy[clearedUserId];
        return copy;
      });
    };
    next.on('PresenceChanged', onPresence);
    next.on('PresenceCleared', onCleared);
    next.onreconnected(async () => {
      if (!disposed) await next.invoke('JoinProject', projectId);
    });
    void next
      .start()
      .then(() => next.invoke('JoinProject', projectId))
      .catch(() => undefined);
    return () => {
      disposed = true;
      if (next.state === HubConnectionState.Connected)
        void next.invoke('ClearPresence', projectId).catch(() => undefined);
      void next.stop();
      connection.current = undefined;
      setRemote({});
    };
  }, [identity, projectId, boardId, userId, getAccessToken]);

  useEffect(() => {
    const active = connection.current;
    if (!active || active.state !== HubConnectionState.Connected || !boardId) return;
    const publish = () => {
      if (active.state !== HubConnectionState.Connected) return;
      const activeElement = document.activeElement;
      const activeItem = activeElement?.closest<HTMLElement>('[data-board-item-id]')?.dataset.boardItemId;
      const editing = Boolean(
        activeItem &&
          selectedRef.current.includes(activeItem) &&
          activeElement?.matches('textarea, input, [contenteditable="true"]'),
      );
      void active
        .invoke('UpdatePresence', {
          projectId,
          boardId,
          itemIds: selectedRef.current.slice(0, 50),
          mode: editing ? 'editing' : 'selected',
        })
        .catch(() => undefined);
    };
    publish();
    const timer = window.setInterval(publish, 5000);
    return () => window.clearInterval(timer);
  }, [projectId, boardId, selectedIds]);

  return useMemo(() => {
    const byItem: Record<string, RemotePresence[]> = {};
    for (const presence of Object.values(remote)) {
      for (const itemId of presence.itemIds) (byItem[itemId] ??= []).push(presence);
    }
    return byItem;
  }, [remote]);
}
