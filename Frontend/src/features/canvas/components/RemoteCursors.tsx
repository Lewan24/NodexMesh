import { MousePointer2 } from 'lucide-react';

import type { RemoteCursor } from '@/features/projects/hooks/useCollaborationPresence';

interface RemoteCursorsProps {
  cursors: RemoteCursor[];
  pan: { x: number; y: number };
  zoom: number;
}

const CURSOR_COLORS = ['#7c3aed', '#db2777', '#0284c7', '#059669', '#ea580c', '#4f46e5', '#c026d3'];

function cursorColor(userId: string) {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) hash = (hash * 31 + userId.charCodeAt(index)) | 0;
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export default function RemoteCursors({ cursors, pan, zoom }: RemoteCursorsProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden" aria-hidden="true">
      {cursors.map((cursor) => {
        const color = cursorColor(cursor.userId);
        return (
          <div
            key={cursor.userId}
            className="absolute left-0 top-0 will-change-transform"
            style={{
              transform: `translate3d(${pan.x + cursor.x * zoom}px, ${pan.y + cursor.y * zoom}px, 0)`,
              transition: 'transform 180ms linear',
            }}
          >
            <MousePointer2
              size={24}
              fill={color}
              color="white"
              strokeWidth={2.5}
              style={{ filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.45))' }}
            />
            <span
              className="absolute left-4 top-5 max-w-44 truncate whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold text-white shadow-md"
              style={{ backgroundColor: color }}
            >
              {cursor.displayName}
            </span>
          </div>
        );
      })}
    </div>
  );
}
