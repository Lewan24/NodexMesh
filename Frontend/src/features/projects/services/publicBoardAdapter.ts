import type { BoardSnapshot, ItemRecord } from '@/entities/board/records';
import type { ProjectRecord } from '@/entities/project/types';
import type { PublicBoardSnapshot, PublicProjectView } from '@/entities/project/shareTypes';
import { parseBoardSnapshot } from './responseValidation';
import { toProjectView } from '@/features/projects/services/boardAdapter';

/**
 * Reuses `toProjectView` (and its `validateItem`/`validateBoard` calls) rather than
 * re-implementing the flat-list → nested-column tree conversion for a second time. The
 * public payload is missing fields the authenticated types require (ownerId, comments,
 * createdBy/updatedBy/deletedAt on items) because the API deliberately never sends them to
 * anonymous viewers — see PublicItemDto in Backend/docs/API.md §6.3c. Those fields are
 * filled with inert placeholders below; `toProjectView` never reads them (it only checks
 * `!item.deletedAt`, which a placeholder `null` satisfies correctly), so this doesn't
 * change what gets rendered, it only satisfies the shared type.
 */
export function toPublicProjectView(payload: PublicBoardSnapshot): PublicProjectView {
  const { project, board, items, links, tags, itemTags } = payload;

  const syntheticProject: ProjectRecord = {
    id: project.id,
    ownerId: '',
    name: project.name,
    color: project.color ?? '#7C3AED',
    revision: '1',
    createdAt: project.updatedAt,
    updatedAt: project.updatedAt,
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
  };

  const syntheticItems: ItemRecord[] = items.map((item) => ({
    ...item,
    createdAt: item.updatedAt,
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
  }));

  const syntheticBoard: BoardSnapshot = {
    board: {
      id: board.id,
      projectId: project.id,
      name: board.name,
      sortOrder: board.sortOrder,
      revision: '1',
      createdAt: project.updatedAt,
      updatedAt: project.updatedAt,
      createdBy: null,
      updatedBy: null,
      deletedAt: null,
    },
    items: syntheticItems,
    links,
    comments: [], // The public API never sends comments — see PublicBoardSnapshotDto.
    tags,
    itemTags,
  };

  parseBoardSnapshot(syntheticBoard);
  const view = toProjectView({ project: syntheticProject, board: syntheticBoard });

  return { id: view.id, name: view.name, color: view.color, items: view.items };
}
