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
if (parameters.get('welcome') !== '1') localStorage.setItem(`nodexmesh.user-guide.${DEMO_USER_ID}`, 'dismissed');
const mixed = parameters.get('board') === 'mixed';
const interactions = parameters.get('board') === 'interactions';
const guide = parameters.get('board')?.startsWith('guide') ?? false;
const dataset = guide ? parameters.get('board')! : interactions ? 'interactions' : mixed ? 'mixed' : 'notes';
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
if (interactions) {
  items.length = 0;
  sequence = 10;
  const first = create('note', 0, 0, { content: 'First grouped note', width: 220, height: 170 });
  const second = create('note', 350, 0, { content: 'Second grouped note', width: 220, height: 170 });
  const frame = create('frame', 0, 350, { title: 'Existing frame', width: 700, height: 300 });
  const child = create('note', 40, 400, { content: 'Frame child', width: 220, height: 170, frameId: frame.id });
  const nested = create('note', 0, 0, { content: 'Nested TODO note', width: 220, height: 140 });
  const column = create('column', 650, 0, { title: 'Nested tasks', width: 300, items: [nested] });
  const boardCard = create('board', 650, 350, {
    title: 'Research board',
    description: 'Ideas and references for the next release.',
  });
  const iconCard = create('icon', 1050, 350);
  items.push(first, second, frame, child, column, boardCard, iconCard);
}
if (guide) {
  items.length = 0;
  sequence = 10;
  if (dataset === 'guide-notes') {
    items.push(
      create('note', 0, 40, {
        content: 'Jeden pomysł na notatkę\n\nProste decyzje i wnioski ze spotkań.',
        width: 250,
        height: 220,
        color: '#fff3c4',
      }),
      create('document', 290, 40, {
        title: 'Plan działania',
        content:
          '<h2>Cel wydania</h2><p>Ułatwić nowym użytkownikom pierwsze kroki.</p><ul><li>Przygotować instrukcję</li><li>Sprawdzić dostępność</li><li>Zebrać opinie zespołu</li></ul>',
        width: 420,
        height: 420,
        autoHeight: false,
      }),
      create('code', 0, 300, {
        content: 'const nextStep = {\n  title: "Zebrać opinie",\n  done: false\n};',
        language: 'javascript',
        width: 250,
        height: 210,
      }),
    );
  } else if (dataset === 'guide-planning') {
    items.push(create('mindmap', 0, 20, { title: 'Mapa pomysłów', width: 930, height: 620 }));
  } else if (dataset === 'guide-connections') {
    const first = create('note', 0, 160, {
      content: 'Decyzja\n\nCo chcemy osiągnąć?',
      width: 250,
      height: 190,
      color: '#fff3c4',
    });
    const second = create('note', 520, 160, {
      content: 'Wdrożenie\n\nKto i kiedy to zrealizuje?',
      width: 250,
      height: 190,
      color: '#dceee5',
    });
    items.push(
      first,
      second,
      create('line', 250, 255, {
        x2: 520,
        y2: 255,
        startItemId: first.id,
        endItemId: second.id,
        startSide: 'right',
        endSide: 'left',
        label: 'następny krok',
        staticAnchors: true,
      }),
    );
  } else {
    items.push(
      create('section-title', 0, 0, { content: 'Nowa strona — plan zespołu', width: 860 }),
      create('note', 0, 90, {
        content: 'Cel projektu\n\nPrzejrzysta strona, na której każdy szybko znajdzie potrzebne informacje.',
        width: 250,
        height: 210,
        color: '#fff3c4',
      }),
      create('note', 280, 90, {
        content: 'Do omówienia\n\n• Nawigacja\n• Dostępność\n• Pierwsze kroki',
        width: 250,
        height: 210,
        color: '#e4e0f4',
      }),
      create('checklist', 560, 90, {
        title: 'Przygotowanie',
        width: 290,
        entries: [
          { id: identity(50), text: 'Ustalić cel', done: true },
          { id: identity(51), text: 'Zebrać materiały', done: false },
          { id: identity(52), text: 'Zaplanować testy', done: false },
        ],
      }),
      create('kanban', 0, 350, {
        title: 'Zadania zespołu',
        width: 850,
        columns: [
          {
            id: identity(60),
            title: 'Do zrobienia',
            color: '#537f83',
            cards: [{ id: identity(61), text: 'Przygotować makiety', done: false, deadline: '2026-11-12' }],
          },
          {
            id: identity(62),
            title: 'W toku',
            color: '#946a6a',
            cards: [{ id: identity(63), text: 'Opisać wymagania', done: false }],
          },
          {
            id: identity(64),
            title: 'Gotowe',
            color: '#66836d',
            cards: [{ id: identity(65), text: 'Ustalić cel projektu', done: true }],
          },
        ],
      }),
    );
  }
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
  project: {
    id: projectId,
    ownerId: DEMO_USER_ID,
    name: guide ? 'Nowa strona — zespół' : 'Rendering benchmark',
    color: '#7c3aed',
    ...metadata,
  },
  board,
};
if (localStorage.getItem(datasetKey) !== dataset) {
  localStorage.setItem(
    mockWorkspaceKey(DEMO_USER_ID),
    JSON.stringify({ formatVersion: 2, projects: [project], boards: { [projectId]: [board] }, receipts: {} }),
  );
  localStorage.setItem(`nodexmesh.default-project.${DEMO_USER_ID}`, projectId);
  localStorage.setItem(
    viewportKey(DEMO_USER_ID, projectId, boardId)!,
    JSON.stringify({ pan: { x: 40, y: 40 }, zoom: guide ? 0.85 : 1 }),
  );
  localStorage.setItem(datasetKey, dataset);
}
await authService.login({ username: 'demo', password: 'demo123' });
if (parameters.get('media') === '1') await import('./identityMediaHarness');
else await import('@/main');
