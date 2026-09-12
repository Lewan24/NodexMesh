import type {
  BoardItem,
  ColumnItem,
} from '@/entities/board/types';

export interface SearchResult {
  matches: boolean;
  nestedMatchIds: Set<string>;
}

export function getSearchableText(
  item: BoardItem,
): string {
  switch (item.type) {
    case 'timeline': return [item.title, ...item.tasks.flatMap(task => [task.title, task.start, task.end, ...task.checklist.map(entry => entry.text)])].join(' ');
    case 'database': return [item.title, ...item.tables.flatMap(table => [table.name, ...table.fields.flatMap(field => [field.name, field.dataType])])].join(' ');
    case 'diagram': return [item.title, ...item.nodes.map(node => node.data.label), ...item.edges.map(edge => edge.label ?? '')].join(' ');
    case 'document': return `${item.title} ${item.content.replace(/<[^>]*>/g, ' ')}`;
    case 'code': return `${item.language} ${item.content}`;
    case 'embed': return `${item.title} ${item.url}`;
    case 'dispenser': return item.title;
    case 'note':
      return item.content;

    case 'text':
      return item.content;

    case 'checklist':
      return [
        item.title,
        ...item.entries.map(
          entry => entry.text,
        ),
      ].join(' ');

    case 'kanban':
      return [
        item.title,
        ...item.columns.flatMap(
          column => [
            column.title,
            ...column.cards.map(
              card => card.text,
            ),
          ],
        ),
      ].join(' ');

    case 'image':
      return item.caption;

    case 'link':
      return [
        item.title,
        item.description,
        item.url,
      ].join(' ');

    case 'frame':
      return item.title;

    case 'column':
      return [
        item.title,
        ...item.items.map(
          getSearchableText,
        ),
      ].join(' ');

    case 'line':
      return item.label ?? '';

    default:
      return '';
  }
}

export function matchesItemSearch(
  item: BoardItem,
  query: string,
): boolean {
  const normalized =
    query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  if (
    normalized.startsWith(
      'status:',
    )
  ) {
    const statusQuery =
      normalized
        .slice(
          'status:'.length,
        )
        .trim();

    if (!statusQuery) {
      return true;
    }

    return (
      item.comments?.some(
        comment =>
          comment.status
            ?.toLowerCase()
            .includes(
              statusQuery,
            ),
      ) ?? false
    );
  }

  /*
   * Tag search.
   */

  if (
    normalized.startsWith('#')
  ) {
    const tagQuery =
      normalized
        .slice(1)
        .trim();

    if (!tagQuery) {
      return true;
    }

    return (
      item.tags?.some(tag =>
        tag
          .toLowerCase()
          .includes(tagQuery),
      ) ?? false
    );
  }

  /*
   * Normal text search.
   */

  return getSearchableText(item)
    .toLowerCase()
    .includes(normalized);
}

export function getColumnSearchResult(
  column: ColumnItem,
  query: string,
): SearchResult {
  const nestedMatchIds =
    new Set<string>();

  for (
    const nestedItem of column.items
  ) {
    if (
      matchesItemSearch(
        nestedItem,
        query,
      )
    ) {
      nestedMatchIds.add(
        nestedItem.id,
      );
    }
  }

  const ownMatch =
    matchesOwnColumnSearch(
      column,
      query,
    );

  return {
    matches:
      ownMatch ||
      nestedMatchIds.size > 0,

    nestedMatchIds,
  };
}
function matchesOwnColumnSearch(
  column: ColumnItem,
  query: string,
): boolean {
  const normalized =
    query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  if (
    normalized.startsWith(
      'status:',
    )
  ) {
    const statusQuery =
      normalized
        .slice(
          'status:'.length,
        )
        .trim();

    if (!statusQuery) {
      return true;
    }

    return (
      column.comments?.some(
        comment =>
          comment.status!
            .toLowerCase()
            .includes(
              statusQuery,
            ),
      ) ?? false
    );
  }

  if (
    normalized.startsWith('#')
  ) {
    const tagQuery =
      normalized
        .slice(1)
        .trim();

    return (
      column.tags?.some(tag =>
        tag
          .toLowerCase()
          .includes(
            tagQuery,
          ),
      ) ?? false
    );
  }

  return column.title
    .toLowerCase()
    .includes(normalized);
}
