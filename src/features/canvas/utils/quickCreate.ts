import type { BoardItem } from '@/entities/board/types';

/** Preserve presentation, never copy content, identifiers or discussion. */
export function createEmptySibling(source: BoardItem): BoardItem | null {
  const base = { ...source, id: crypto.randomUUID(), tags: undefined, comments: undefined, locked: false };
  switch (base.type) {
    case 'timeline':
      return { ...base, title: 'Project timeline', tasks: [] };
    case 'database':
      return { ...base, title: 'Database schema', tables: [], relations: [] };
    case 'diagram':
      return { ...base, title: 'System diagram', nodes: [], edges: [] };
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
      return { ...base, title: 'Untitled document', content: '' };
    case 'code':
      return { ...base, content: '' };
    case 'checklist':
      return { ...base, title: 'Checklist', entries: [] };
    case 'kanban':
      return {
        ...base,
        title: 'New Board',
        columns: base.columns.map((column) => ({ ...column, id: crypto.randomUUID(), cards: [] })),
      };
    case 'image':
      return { ...base, url: '', caption: '' };
    case 'embed':
      return { ...base, url: '', title: '' };
    case 'link':
      return { ...base, url: '', title: 'New Link', description: '' };
    case 'column':
      return { ...base, title: 'Column', items: [] };
    case 'frame':
    case 'drawing':
    case 'dispenser':
    case 'line':
      return null;
  }
}
