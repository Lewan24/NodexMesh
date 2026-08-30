import type { ToolType } from '@/entities/board/toolTypes';
import { SIDEBAR_TOOLS } from './sidebarTools';

import {
  consumeToolDragClickSuppression,
  startToolDrag,
} from '@/features/canvas/utils/toolDrag';

interface SidebarProps {
  selectedTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}

export default function Sidebar({ selectedTool, onSelectTool }: SidebarProps) {
  return (
    <aside
      className="w-[88px] h-full flex flex-col flex-shrink-0 relative z-30"
      style={{
        backgroundColor: 'var(--color-chrome-bg)',
        borderRight: '1px solid var(--color-chrome-border)',
      }}
    >
      <div className="flex-1 flex flex-col items-center py-3 gap-2 overflow-y-auto">
        {SIDEBAR_TOOLS.map(tool => {
          const active = selectedTool === tool.id;

          return (
            <button
              key={tool.id}
              aria-label={tool.label}
              title={tool.label}
              onClick={() => {
                if (consumeToolDragClickSuppression()) return;

                onSelectTool(tool.id);
              }}
              onMouseDown={event => {
                startToolDrag(tool.id, event);
              }}
              className="flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-all duration-100 flex-shrink-0 cursor-grab active:cursor-grabbing"
              style={{
                width: 76,
                height: 76,
                backgroundColor: active ? 'var(--color-accent-soft-strong)' : 'transparent',
                color: active ? 'var(--color-accent)' : 'var(--color-chrome-text-dim)',
                boxShadow: active ? 'inset 0 0 0 1.5px rgba(124, 58, 237, 0.45)' : 'none',
              }}
              onMouseEnter={e => {
                if (active) return;

                e.currentTarget.style.backgroundColor = 'var(--color-chrome-hover)';
                e.currentTarget.style.color = 'var(--color-chrome-text)';
              }}
              onMouseLeave={e => {
                if (active) return;

                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-chrome-text-dim)';
              }}
            >
              {tool.icon}
              <span className="text-sm font-medium">{tool.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}