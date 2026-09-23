import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from '@microsoft/signalr';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface RemotePresence {
  userId: string;
  displayName: string;
  itemIds: string[];
  mode: 'selected' | 'editing';
  cursorX?: number | null;
  cursorY?: number | null;
  expiresAt: string;
}

export interface RemoteCursor {
  userId: string;
  displayName: string;
  x: number;
  y: number;
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
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const lastPublishedAt = useRef(0);
  const publishTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const identity = `${projectId}:${boardId ?? ''}:${userId}`;

  const publish = () => {
    const active = connection.current;
    if (!boardId || !active || active.state !== HubConnectionState.Connected) return;
    const activeElement = document.activeElement;
    const activeItem = activeElement?.closest<HTMLElement>('[data-board-item-id]')?.dataset.boardItemId;
    const editing = Boolean(
      activeItem &&
        selectedRef.current.includes(activeItem) &&
        activeElement?.matches('textarea, input, [contenteditable="true"]'),
    );
    lastPublishedAt.current = Date.now();
    void active
      .invoke('UpdatePresence', {
        projectId,
        boardId,
        itemIds: selectedRef.current.slice(0, 50),
        mode: editing ? 'editing' : 'selected',
        cursorX: cursorRef.current?.x ?? null,
        cursorY: cursorRef.current?.y ?? null,
      })
      .catch(() => undefined);
  };

  const schedulePublish = () => {
    if (publishTimer.current) return;
    const delay = Math.max(0, 250 - (Date.now() - lastPublishedAt.current));
    publishTimer.current = setTimeout(() => {
      publishTimer.current = undefined;
      publish();
    }, delay);
  };

  const updateCursor = (cursor: { x: number; y: number } | null) => {
    cursorRef.current = cursor;
    schedulePublish();
  };

  useEffect(() => {
    if (!projectId || !boardId || !userId) return;
    cursorRef.current = null;
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
    next.on('BoardChanged', (changedProjectId: string, changedBoardId: string) => {
      if (!disposed && changedProjectId === projectId && changedBoardId === boardId)
        window.dispatchEvent(new CustomEvent('nodexmesh:board-changed', { detail: { projectId, boardId } }));
    });
    next.on('PresenceChanged', onPresence);
    next.on('PresenceCleared', onCleared);
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const join = async () => {
      if (disposed) return;
      await next.invoke('JoinProject', projectId);
      publish();
      window.dispatchEvent(new CustomEvent('nodexmesh:board-changed', { detail: { projectId, boardId } }));
    };
    const start = async () => {
      try {
        await next.start();
        if (disposed) {
          await next.stop();
          return;
        }
        await join();
      } catch {
        if (!disposed) {
          await next.stop();
          clearTimeout(retryTimer);
          retryTimer = setTimeout(() => void start(), 10000);
        }
      }
    };
    next.onreconnected(() => join().catch(() => undefined));
    next.onclose(() => {
      if (!disposed) {
        clearTimeout(retryTimer);
        retryTimer = setTimeout(() => void start(), 10000);
      }
    });
    void start();
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      clearTimeout(publishTimer.current);
      publishTimer.current = undefined;
      if (next.state === HubConnectionState.Connected)
        void next.invoke('ClearPresence', projectId).catch(() => undefined);
      void next.stop();
      connection.current = undefined;
      setRemote({});
    };
  }, [identity, projectId, boardId, userId, getAccessToken]);

  useEffect(() => {
    if (!boardId) return;
    const clearCursor = () => {
      cursorRef.current = null;
      schedulePublish();
    };
    schedulePublish();
    const timer = window.setInterval(schedulePublish, 5000);
    const expire = window.setInterval(
      () =>
        setRemote((current) => {
          const entries = Object.entries(current).filter(([, value]) => Date.parse(value.expiresAt) > Date.now());
          return entries.length === Object.keys(current).length ? current : Object.fromEntries(entries);
        }),
      1000,
    );
    document.addEventListener('focusin', schedulePublish);
    document.addEventListener('focusout', schedulePublish);
    window.addEventListener('blur', clearCursor);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(expire);
      document.removeEventListener('focusin', schedulePublish);
      document.removeEventListener('focusout', schedulePublish);
      window.removeEventListener('blur', clearCursor);
    };
  }, [projectId, boardId, selectedIds]);

  const byItem = useMemo(() => {
    const byItem: Record<string, RemotePresence[]> = {};
    for (const presence of Object.values(remote)) {
      for (const itemId of presence.itemIds) (byItem[itemId] ??= []).push(presence);
    }
    return byItem;
  }, [remote]);

  const cursors = useMemo(
    () =>
      Object.values(remote).flatMap((presence) =>
        typeof presence.cursorX === 'number' && typeof presence.cursorY === 'number'
          ? [{ userId: presence.userId, displayName: presence.displayName, x: presence.cursorX, y: presence.cursorY }]
          : [],
      ),
    [remote],
  );

  return { byItem, cursors, updateCursor };
}
