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
  Heading,
  StickyNote,
  Type,
  Columns3,
  ListTodo,
  PanelTop,
  Image,
  Link,
  MoveUpRight,
  Frame,
  MousePointer2,
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
    icon: <Heading size={TOOL_ICON_SIZE} />,
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
    icon: <MousePointer2 size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'note',
    get label() {
      return translate('Sticky Note');
    },
    icon: <StickyNote size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'text',
    get label() {
      return translate('Text');
    },
    icon: <Type size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'kanban',
    get label() {
      return translate('Kanban Board');
    },
    icon: <Columns3 size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'checklist',
    get label() {
      return translate('Checklist');
    },
    icon: <ListTodo size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'column',
    get label() {
      return translate('Column');
    },
    icon: <PanelTop size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'image',
    get label() {
      return translate('Image');
    },
    icon: <Image size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'link',
    get label() {
      return translate('Link Card');
    },
    icon: <Link size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'line',
    get label() {
      return translate('Line / Arrow');
    },
    icon: <MoveUpRight size={TOOL_ICON_SIZE} />,
  },
  {
    id: 'frame',
    get label() {
      return translate('Frame');
    },
    icon: <Frame size={TOOL_ICON_SIZE} />,
  },
];
