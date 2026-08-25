import type { ToolType } from './types';

interface Props {
  selectedTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}

const TOOLSIZE = 22;

const TOOLS: {
  id: ToolType;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'select',
    label: 'Select',
    icon: (
      <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m4 4 7.07 17 2.51-7.39L21 11.07z" />
      </svg>
    ),
  },
  {
    id: 'note',
    label: 'Sticky Note',
    icon: (
      <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M7 8h10M7 12h7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Text',
    icon: (
      <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2">
        <path
          d="M4 7V4h16v3M9 20h6M12 4v16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'kanban',
    label: 'Kanban Board',
    icon: (
      <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="5" height="15" rx="1" />
        <rect x="10" y="3" width="5" height="10" rx="1" />
        <rect x="17" y="3" width="4" height="12" rx="1" />
      </svg>
    ),
  },
  {
    id: 'checklist',
    label: 'Checklist',
    icon: (
      <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2">
        <path
          d="M9 11l3 3L22 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: 'column',
    label: 'Column',
    icon: (
      <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M4 8h16M4 13h16" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'image',
    label: 'Image',
    icon: (
      <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
    ),
  },
  {
    id: 'link',
    label: 'Link Card',
    icon: (
      <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    id: 'line',
    label: 'Line / Arrow',
    icon: (
      <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 19L19 5" strokeLinecap="round" />
        <path
          d="M19 5h-6M19 5v6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'frame',
    label: 'Frame',
    icon: (
      <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="2"
          strokeDasharray="4 2"
        />
      </svg>
    ),
  },
];

export default function Sidebar({
  selectedTool,
  onSelectTool,
}: Props) {
  return (
    <aside
      className="w-[72px] h-full flex flex-col flex-shrink-0 relative z-30"
      style={{
        backgroundColor: 'var(--color-chrome-bg)',
        borderRight: '1px solid var(--color-chrome-border)',
      }}
    >
      <div className="flex-1 flex flex-col items-center py-3 gap-1.5 overflow-y-auto">
        {TOOLS.map(tool => {
          const active = selectedTool === tool.id;

          return (
            <button
              key={tool.id}
              aria-label={tool.label}
              onClick={() => onSelectTool(tool.id)}
              className="size-18 flex flex-col items-center justify-center rounded-xl transition-all duration-100 flex-shrink-0"
              style={{
                backgroundColor: active
                  ? 'var(--color-accent-soft-strong)'
                  : 'transparent',

                color: active
                  ? 'var(--color-accent)'
                  : 'var(--color-chrome-text-dim)',

                boxShadow: active
                  ? 'inset 0 0 0 1px rgba(124, 58, 237, 0.4)'
                  : 'none',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.backgroundColor =
                    'var(--color-chrome-hover)';

                  e.currentTarget.style.color =
                    'var(--color-chrome-text)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.backgroundColor =
                    'transparent';

                  e.currentTarget.style.color =
                    'var(--color-chrome-text-dim)';
                }
              }}
            >
              {tool.icon}
              <span className='text-sm'>{tool.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}