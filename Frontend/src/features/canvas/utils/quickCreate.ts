import { translate } from '@/shared/i18n';
import { createId } from '@/shared/lib/createId';
import { mindmapTemplate } from '@/features/blocks/mindmap/mindmapUtils';
import type { BoardItem } from '@/entities/board/types';

/** Preserve presentation, never copy content, identifiers or discussion. */
export function createEmptySibling(source: BoardItem): BoardItem | null {
  const base = { ...source, id: createId(), tags: undefined, comments: undefined, locked: false };
  switch (base.type) {
    case 'timeline':
      return { ...base, title: translate('Project timeline'), tasks: [] };
    case 'database':
      return { ...base, title: translate('Database schema'), tables: [], relations: [] };
    case 'mindmap':
      return { ...base, title: translate('Mind map'), nodes: mindmapTemplate(false) };
    case 'diagram':
      return { ...base, title: translate('System diagram'), nodes: [], edges: [] };
    case 'note':
      return {
        ...base,
        content: '',
        dispenserId: undefined,
        typography: base.dispenserId
          ? { textAlign: 'center', verticalAlign: 'middle', ...base.typography }
          : base.typography,
      };
    case 'section-title':
    case 'text':
      return { ...base, content: '' };
    case 'document':
      return { ...base, title: translate('Untitled document'), content: '' };
    case 'code':
      return { ...base, content: '' };
    case 'checklist':
      return { ...base, title: translate('Checklist'), entries: [] };
    case 'kanban':
      return {
        ...base,
        title: translate('New Board'),
        columns: base.columns.map((column) => ({ ...column, id: createId(), cards: [] })),
      };
    case 'icon':
      return { ...base, iconMode: 'preset', source: 'star', label: translate('Star') };
    case 'image':
      return { ...base, url: '', caption: '' };
    case 'embed':
      return { ...base, url: '', title: '' };
    case 'link':
      return { ...base, url: '', title: translate('New Link'), description: '' };
    case 'board':
      return {
        ...base,
        boardId: null,
        title: translate('New board'),
        description: translate('Double-click to open this board'),
        icon: 'layout-dashboard',
      };
    case 'column':
      return { ...base, title: translate('Column'), items: [] };
    case 'frame':
    case 'drawing':
    case 'dispenser':
    case 'line':
      return null;
  }
}
