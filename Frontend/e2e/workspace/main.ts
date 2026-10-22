import { authService, isMockDataSource } from '@/app/services';
import { DEMO_USER_ID } from '@/entities/user/mockUsers';
import { createCanvasItem } from '@/features/canvas/utils/createCanvasItem';
import { flattenItems } from '@/features/projects/services/boardAdapter';
import { mockWorkspaceKey } from '@/features/projects/services/mockWorkspace';
import { validateBoard } from '@/entities/board/boardValidation';
import { viewportKey } from '@/features/board/hooks/boardViewport';
import type { BoardItem } from '@/entities/board/types';
import type { BoardSnapshot } from '@/entities/board/records';
import type { ProjectSnapshot } from '@/entities/project/types';
import type { ToolType } from '@/entities/board/toolTypes';

// This entry only exists in the separate diagnostic build. The application itself is unchanged.
if (!isMockDataSource) throw new Error('The workspace benchmark requires the isolated mock build.');
const datasetKey = 'nodexmesh.benchmark.dataset';
if (localStorage.getItem(mockWorkspaceKey(DEMO_USER_ID)) !== null && localStorage.getItem(datasetKey) === null) {
  throw new Error('The workspace benchmark requires a fresh browser context; existing demo data was not changed.');
}
const parameters = new URLSearchParams(location.search);
const mixed = parameters.get('board') === 'mixed';
const identity = (index: number) => `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
const projectId = identity(1);
const boardId = identity(2);
let sequence = 10;
const create = (type: ToolType, x: number, y: number, patch: Record<string, unknown> = {}): BoardItem => {
  const item = createCanvasItem(type, x, y);
  if (!item) throw new Error(`Unsupported benchmark item: ${type}`);
  return { ...item, id: identity(sequence++), zIndex: sequence, ...patch } as BoardItem;
};
const items: BoardItem[] = Array.from({ length: mixed ? 240 : 1000 }, (_, index) =>
  create('note', (index % 30) * 280, Math.floor(index / 30) * 240, {
    content: `Planning note ${index}\nA representative note in the complete application shell.`,
    width: 220,
    height: 170,
  }),
);
if (mixed) {
  for (let index = 0; index < 4; index++) {
    items.push(
      create('document', 1200 + index * 1000, 900, {
        title: `Document ${index}`,
        content: '<h2>Project brief</h2>' + '<p>Editable planning content and decisions.</p>'.repeat(12),
      }),
    );
    items.push(
      create('column', 1200 + index * 1000, 1600, {
        title: `Workstream ${index}`,
        items: Array.from({ length: 4 }, (_, child) =>
          create('note', 0, 0, { content: `Nested note ${child}`, width: 280, height: 120 }),
        ),
      }),
    );
    items.push(create('frame', index * 1600 - 40, -60, { title: `Milestone ${index}`, width: 1500, height: 800 }));
  }
  for (let index = 0; index < 80; index++) {
    const start = items[index]!;
    const end = items[index + 30]!;
    items.push(
      create('line', start.x + 110, start.y + 170, {
        x2: end.x + 110,
        y2: end.y,
        startItemId: start.id,
        endItemId: end.id,
      }),
    );
  }
  items.push(create('diagram', 200, 2400), create('mindmap', 1500, 2400));
}
const metadata = {
  revision: '1',
  createdAt: '2026-10-21T00:00:00Z',
  updatedAt: '2026-10-21T00:00:00Z',
  createdBy: DEMO_USER_ID,
  updatedBy: DEMO_USER_ID,
  deletedAt: null,
};
const flattened = flattenItems(items, boardId);
const board: BoardSnapshot = {
  board: { id: boardId, projectId, name: mixed ? 'Mixed board' : 'Notes board', sortOrder: 0, ...metadata },
  items: flattened.map((entry) => ({ ...entry.item, ...metadata })),
  links: flattened.flatMap((entry) => entry.links),
  comments: [],
  tags: [],
  itemTags: [],
};
validateBoard(board);
const project: ProjectSnapshot = {
  project: { id: projectId, ownerId: DEMO_USER_ID, name: 'Rendering benchmark', color: '#7c3aed', ...metadata },
  board,
};
if (localStorage.getItem(datasetKey) !== (mixed ? 'mixed' : 'notes')) {
  localStorage.setItem(
    mockWorkspaceKey(DEMO_USER_ID),
    JSON.stringify({ formatVersion: 2, projects: [project], boards: { [projectId]: [board] }, receipts: {} }),
  );
  localStorage.setItem(`nodexmesh.default-project.${DEMO_USER_ID}`, projectId);
  localStorage.setItem(
    viewportKey(DEMO_USER_ID, projectId, boardId)!,
    JSON.stringify({ pan: { x: 40, y: 40 }, zoom: 1 }),
  );
  localStorage.setItem(datasetKey, mixed ? 'mixed' : 'notes');
}
await authService.login({ username: 'demo', password: 'demo123' });
await import('@/main');
