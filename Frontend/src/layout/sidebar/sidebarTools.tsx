import { translate } from '@/shared/i18n';
import type { ReactNode } from 'react';
import type { ToolType } from '@/entities/board/toolTypes';
import {
  Smile,
  FileText,
  File,
  Code,
  PanelsTopLeft,
  Layers,
  Minus,
  GanttChart,
  Workflow,
  GitFork,
  Pencil,
  Database,
  LayoutDashboard,
} from 'lucide-react';

const TOOL_ICON_SIZE = 26;

export interface SidebarTool {
  id: ToolType;
  label: string;
  icon: ReactNode;
}

export const SIDEBAR_TOOLS: SidebarTool[] = [
  {
    id: 'board',
    get label() {
      return translate('Board');
    },
    icon: <LayoutDashboard size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'icon',
    get label() {
      return translate('Icon / Emoji');
    },
    icon: <Smile size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'section-title',
    get label() {
      return translate('Section title');
    },
    icon: <FileText size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'drawing',
    get label() {
      return translate('Pencil');
    },
    icon: <Pencil size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'timeline',
    get label() {
      return translate('Timeline');
    },
    icon: <GanttChart size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'database',
    get label() {
      return translate('Database diagram');
    },
    icon: <Database size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'mindmap',
    get label() {
      return translate('Mind map');
    },
    icon: <GitFork size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'diagram',
    get label() {
      return translate('Diagram');
    },
    icon: <Workflow size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'document',
    get label() {
      return translate('Document');
    },
    icon: <FileText size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'file',
    get label() {
      return translate('File');
    },
    icon: <File size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'code',
    get label() {
      return translate('Code');
    },
    icon: <Code size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'embed',
    get label() {
      return translate('Embed');
    },
    icon: <PanelsTopLeft size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'dispenser',
    get label() {
      return translate('Note dispenser');
    },
    icon: <Layers size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'divider',
    get label() {
      return translate('Divider');
    },
    icon: <Minus size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'select',
    get label() {
      return translate('Select');
    },
    icon: (
      <svg
        width={TOOL_ICON_SIZE}
        height={TOOL_ICON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m4 4 7.07 17 2.51-7.39L21 11.07z" />
      </svg>
    ),
  },
  {
    id: 'note',
    get label() {
      return translate('Sticky Note');
    },
    icon: (
      <svg
        width={TOOL_ICON_SIZE}
        height={TOOL_ICON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M7 8h10M7 12h7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'text',
    get label() {
      return translate('Text');
    },
    icon: (
      <svg
        width={TOOL_ICON_SIZE}
        height={TOOL_ICON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M4 7V4h16v3M9 20h6M12 4v16" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'kanban',
    get label() {
      return translate('Kanban Board');
    },
    icon: (
      <svg
        width={TOOL_ICON_SIZE}
        height={TOOL_ICON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="3" width="5" height="15" rx="1" />
        <rect x="10" y="3" width="5" height="10" rx="1" />
        <rect x="17" y="3" width="4" height="12" rx="1" />
      </svg>
    ),
  },
  {
    id: 'checklist',
    get label() {
      return translate('Checklist');
    },
    icon: (
      <svg
        width={TOOL_ICON_SIZE}
        height={TOOL_ICON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: 'column',
    get label() {
      return translate('Column');
    },
    icon: (
      <svg
        width={TOOL_ICON_SIZE}
        height={TOOL_ICON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M4 8h16M4 13h16" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'image',
    get label() {
      return translate('Image');
    },
    icon: (
      <svg
        width={TOOL_ICON_SIZE}
        height={TOOL_ICON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
    ),
  },
  {
    id: 'link',
    get label() {
      return translate('Link Card');
    },
    icon: (
      <svg
        width={TOOL_ICON_SIZE}
        height={TOOL_ICON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    id: 'line',
    get label() {
      return translate('Line / Arrow');
    },
    icon: (
      <svg
        width={TOOL_ICON_SIZE}
        height={TOOL_ICON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M5 19L19 5" strokeLinecap="round" />
        <path d="M19 5h-6M19 5v6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'frame',
    get label() {
      return translate('Frame');
    },
    icon: (
      <svg
        width={TOOL_ICON_SIZE}
        height={TOOL_ICON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
      </svg>
    ),
  },
];
