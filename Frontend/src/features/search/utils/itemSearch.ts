import type { ProjectStatus } from '@/features/statuses/types';
import type { BoardItem, ColumnItem, ChecklistEntry } from '@/entities/board/types';

export interface SearchResult {
  matches: boolean;
  nestedMatchIds: Set<string>;
}

export interface BoardSearchResult {
  targets: { item: BoardItem; columnId?: string }[];
  matchingIds: Set<string>;
  nestedColumnMatches: Map<string, Set<string>>;
  contextFrameIds: Set<string>;
}

const taskText = (task: ChecklistEntry) =>
  [task.text, task.description ?? '', task.deadline ?? '', ...(task.subtasks ?? []).map((s) => s.text)].join(' ');

export function getSearchableText(item: BoardItem): string {
  switch (item.type) {
    case 'board':
      return `${item.title} ${item.description}`;
    case 'timeline':
      return [
        item.title,
        ...item.tasks.flatMap((task) => [
          task.title,
          task.start,
          task.end,
          ...task.checklist.map((entry) => entry.text),
        ]),
      ].join(' ');
    case 'database':
      return [
        item.title,
        ...item.tables.flatMap((table) => [
          table.name,
          ...table.fields.flatMap((field) => [field.name, field.dataType]),
        ]),
      ].join(' ');
    case 'mindmap':
      return [item.title, ...item.nodes.map((node) => node.label)].join(' ');
    case 'diagram':
      return [
        item.title,
        ...item.nodes.map((node) => node.data.label),
        ...item.edges.map((edge) => edge.label ?? ''),
      ].join(' ');
    case 'document':
      return `${item.title} ${item.content.replace(/<[^>]*>/g, ' ')}`;
    case 'code':
      return `${item.language} ${item.content}`;
    case 'embed':
      return `${item.title} ${item.url}`;
    case 'dispenser':
      return item.title;
    case 'note':
      return item.content;

    case 'section-title':
    case 'text':
      return item.content;

    case 'checklist':
      return [item.title, ...item.entries.map(taskText)].join(' ');

    case 'kanban':
      return [item.title, ...item.columns.flatMap((column) => [column.title, ...column.cards.map(taskText)])].join(' ');

    case 'icon':
      return `${item.label} ${item.iconMode === 'svg' ? '' : item.source}`;
    case 'image':
      return item.caption;
    case 'file':
      return `${item.title} ${item.fileName} ${item.contentType}`;

    case 'link':
      return [item.title, item.description, item.url].join(' ');

    case 'frame':
      return item.title;

    case 'column':
      return [item.title, ...item.items.map(getSearchableText)].join(' ');

    case 'line':
      return item.label ?? '';

    default:
      return '';
  }
}

export function matchesItemSearch(item: BoardItem, query: string, statuses: readonly ProjectStatus[] = []): boolean {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  if (
    normalized.startsWith('status:') ||
    normalized.startsWith('item-status:') ||
    normalized.startsWith('comment-status:')
  ) {
    const statusQuery = normalized.slice(normalized.indexOf(':') + 1).trim();

    if (!statusQuery) {
      return true;
    }

    return matchesStatusSearch(item, normalized, statusQuery, statuses);
  }

  /*
   * Tag search.
   */

  if (normalized.startsWith('#')) {
    const tagQuery = normalized.slice(1).trim();

    if (!tagQuery) {
      return true;
    }

    return item.tags?.some((tag) => tag.toLowerCase().includes(tagQuery)) ?? false;
  }

  /*
   * Normal text search.
   */

  const status = statuses.find((status) => status.id === item.statusId);
  return `${getSearchableText(item)} ${status?.title ?? ''} ${status?.description ?? ''}`
    .toLowerCase()
    .includes(normalized);
}

export function getColumnSearchResult(
  column: ColumnItem,
  query: string,
  statuses: readonly ProjectStatus[] = [],
): SearchResult {
  const nestedMatchIds = new Set<string>();

  for (const nestedItem of column.items) {
    if (matchesItemSearch(nestedItem, query, statuses)) {
      nestedMatchIds.add(nestedItem.id);
    }
  }

  const ownMatch = matchesOwnColumnSearch(column, query, statuses);

  return {
    matches: ownMatch || nestedMatchIds.size > 0,

    nestedMatchIds,
  };
}
export function getSearchTargets(
  items: BoardItem[],
  query: string,
  statuses: readonly ProjectStatus[] = [],
): { item: BoardItem; columnId?: string }[] {
  if (!query.trim()) return [];
  return items.flatMap<{ item: BoardItem; columnId?: string }>((item) => {
    if (item.type !== 'column') return matchesItemSearch(item, query, statuses) ? [{ item }] : [];
    return [
      ...(matchesOwnColumnSearch(item, query, statuses) ? [{ item }] : []),
      ...item.items
        .filter((child) => matchesItemSearch(child, query, statuses))
        .map((child) => ({ item: child, columnId: item.id })),
    ];
  });
}

/** Share content matching between navigation and canvas highlighting. */
export function getBoardSearchResult(
  items: BoardItem[],
  query: string,
  statuses: readonly ProjectStatus[] = [],
): BoardSearchResult {
  const active = query.trim().length > 0;
  const targets: BoardSearchResult['targets'] = [];
  const matchingIds = new Set<string>();
  const nestedColumnMatches = new Map<string, Set<string>>();
  const frameIds = new Set<string>();
  for (const item of items) {
    if (item.type === 'frame') frameIds.add(item.id);
    if (item.type === 'column') {
      const result = getColumnSearchResult(item, query, statuses);
      nestedColumnMatches.set(item.id, result.nestedMatchIds);
      if (result.matches) matchingIds.add(item.id);
      if (active) {
        if (matchesOwnColumnSearch(item, query, statuses)) targets.push({ item });
        for (const child of item.items) {
          if (result.nestedMatchIds.has(child.id)) targets.push({ item: child, columnId: item.id });
        }
      }
    } else if (matchesItemSearch(item, query, statuses)) {
      matchingIds.add(item.id);
      if (active) targets.push({ item });
    }
  }

  const contextFrameIds = new Set<string>();
  if (active) {
    for (const item of items) {
      if (matchingIds.has(item.id) && item.frameId && item.frameId !== item.id && frameIds.has(item.frameId)) {
        contextFrameIds.add(item.frameId);
      }
    }
  }
  return { targets, matchingIds, nestedColumnMatches, contextFrameIds };
}

function matchesOwnColumnSearch(column: ColumnItem, query: string, statuses: readonly ProjectStatus[] = []): boolean {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  if (
    normalized.startsWith('status:') ||
    normalized.startsWith('item-status:') ||
    normalized.startsWith('comment-status:')
  ) {
    const statusQuery = normalized.slice(normalized.indexOf(':') + 1).trim();

    if (!statusQuery) {
      return true;
    }

    return matchesStatusSearch(column, normalized, statusQuery, statuses);
  }

  if (normalized.startsWith('#')) {
    const tagQuery = normalized.slice(1).trim();

    return column.tags?.some((tag) => tag.toLowerCase().includes(tagQuery)) ?? false;
  }

  const status = statuses.find((status) => status.id === column.statusId);
  return `${column.title} ${status?.title ?? ''} ${status?.description ?? ''}`.toLowerCase().includes(normalized);
}

function matchesStatusSearch(
  item: BoardItem,
  query: string,
  term: string,
  statuses: readonly ProjectStatus[],
): boolean {
  const status = statuses.find((status) => status.id === item.statusId);
  const itemMatch = !!status && (status.title.toLowerCase().includes(term) || status.id === term);
  if (query.startsWith('item-status:')) return itemMatch;
  const commentMatch = item.comments?.some((comment) => comment.status?.toLowerCase().includes(term)) ?? false;
  return query.startsWith('comment-status:') ? commentMatch : itemMatch || commentMatch;
}
