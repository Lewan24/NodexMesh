import type { Project, User } from './types';

// ─── Mock users ──────────────────────────────────────────────────────────
// There is no self-registration in this app — accounts are provisioned by
// an admin (see AdminUsersPanel). These two accounts exist so the app is
// usable out of the box; replace with a real user store when the API lands.
export const initialUsers: User[] = [
  { id: 'user-admin', username: 'admin', password: 'admin123', name: 'Admin', role: 'admin' },
  { id: 'user-demo', username: 'demo', password: 'demo123', name: 'Demo User', role: 'user' },
];

const DEMO_OWNER = 'user-demo';

// ─── Mock projects (all owned by the demo user) ────────────────────────────
export const initialProjects: Project[] = [
  {
    id: 'proj-design',
    name: 'Product Design',
    color: '#7C3AED',
    ownerId: DEMO_OWNER,
    items: [
      {
        id: 'f-ideation', type: 'frame', x: -112, y: -84, zIndex: 0,
        title: 'Ideation', width: 605, height: 744, color: '#FFBD65',
      },
      {
        id: 't-ideation-heading', type: 'text', content: 'Ideation Section Header', size: 'xl', x: 0, y: -56, zIndex: 2
      },
      {
        id: 'n-goal', type: 'note', x: -76, y: 36, zIndex: 1, width: 220,
        content: '🎯 Goal: Redesign the onboarding\n\nFocus on first-time user experience and cut time-to-value in half.',
        color: '#0d2a35',
      },
      {
        id: 'n-research', type: 'note', x: 176, y: 36, zIndex: 2, width: 281, height: 339,
        content: '🔍 Research:\n• User interviews ×8\n• Competitor analysis\n• Heatmap review\n• Session recordings\n\n\n And some prepared heigth for future texts',
        color: '#431407',
      },
      {
        id: 'c-samplechecklist', type: 'checklist', x: -76, y: 232, zIndex: 2, width: 220,
        title: 'Checklist', color: '#fefce8', entries: [
          {
            id: 'ce1-1', text: 'Task one', done: false
          },
          {
            id: 'ce1-2', text: 'Task two', done: true
          }
        ]
      },
      {
        id: 'img-landscape', type: 'image', x: -76, y: 428, zIndex: 2,
        url: 'https://media.gettyimages.com/id/607280514/photo/lupins-of-lake-tekapo.jpg?s=2048x2048&w=gi&k=20&c=7KSjP3WWoCO89Rhwb86aEhFT1nbnT2RjXK7MvkNlELg=',
        caption: '',
        width: 532, imgHeight: 142,
      },
      {
        id: 'k-sprint', type: 'kanban', x: 924, y: -84, zIndex: 3,
        title: 'Sprint 12',
        columns: [
          { id: 'col-todo', title: 'To Do', color: '#5a8a94', cards: [
            { id: 'c1', text: 'User interview synthesis', done: false },
            { id: 'c2', text: 'Wireframes v1', done: false },
            { id: 'c3', text: 'A/B test plan', done: false },
          ]},
          { id: 'col-wip', title: 'In Progress', color: '#FFBD65', cards: [
            { id: 'c4', text: 'Design system audit', done: false },
          ]},
          { id: 'col-done', title: 'Done', color: '#7C3AED', cards: [
            { id: 'c6', text: 'Project kickoff', done: true }
          ]},
          { id: 'col-new', title: 'Test', color: '#02a0a0', cards: [
            { id: 'c7', text: 'Stakeholder alignment', done: true },
          ]},
        ],
      },
      {
        id: 'col-resources', type: 'column', x: 532, y: -84, zIndex: 2,
        title: 'Resources', color: '#f0f9ff', width: 347,
        items: [
          {
            id: 'ci1', type: 'link', x: 0, y: 0, zIndex: 1,
            url: 'https://lewan24.github.io', title: 'Author webpage',
            description: '',
          },
          {
            id: 'ci2', type: 'note', x: 0, y: 0, zIndex: 1, width: 240,
            content: '📁 Figma design file — main workspace\n\nCheck the shared library.',
            color: '#fefce8', topColor: '#7C3AED',
          },
          {
            id: 'ci3', type: 'note', x: 0, y: 0, zIndex: 1, width: 240,
            content: '🎨 Brand guidelines\n\nColors, typography, tone of voice',
            color: '#fff7ed', topColor: '#FFBD65',
          },
        ],
      },
      {
        id: 'cl-design', type: 'checklist', x: 924, y: 336, zIndex: 2,
        title: 'Design Checklist', color: '#0d2a35', width: 265,
        entries: [
          { id: 'de1', text: 'Typography scale defined', done: true },
          { id: 'de2', text: 'Component library', done: true },
          { id: 'de3', text: 'Accessibility audit', done: false },
          { id: 'de4', text: 'Dark mode tokens', done: false },
          { id: 'de5', text: 'Export assets', done: false },
        ],
      },
      {
        id: 'l-line', type: 'line', x: 1, x2: 1, y: 1, y2: 1, arrowStart: true, arrowEnd: true, color: '#7C3AED', strokeWidth: 2, zIndex: 100,
        startItemId: 'cl-design', endItemId: 'k-sprint'
      },
      {
        id: 't-headingtest', type: 'text', color: '#f1f5f9', content: 'Test heading as block', x: 1260, y: 336, size: 'xl', zIndex: 2,
        topColor: '#e11d48'
      },
    ],
  },
  {
    id: 'proj-marketing',
    name: 'Q4 Marketing',
    color: '#FFBD65',
    ownerId: DEMO_OWNER,
    items: [
      {
        id: 'n-launch', type: 'note', x: 80, y: 80, zIndex: 1, width: 220,
        content: '🚀 Q4 Campaign Launch\n\nTarget: 10K new signups\nBudget: $25K\nDeadline: Dec 1st',
        color: '#0d2a35',
      },
      {
        id: 'n-channels', type: 'note', x: 320, y: 80, zIndex: 2, width: 220,
        content: '📢 Channels:\n• Email (45K list)\n• Twitter / X\n• Product Hunt\n• LinkedIn Ads',
        color: '#0d2a35',
      },
      {
        id: 'k-content', type: 'kanban', x: 80, y: 300, zIndex: 3,
        title: 'Content Calendar',
        columns: [
          { id: 'col-ideas', title: 'Ideas', color: '#8B5CF6', cards: [
            { id: 'mc1', text: '"10x your workflow" blog post', done: false },
            { id: 'mc2', text: 'Customer spotlight video', done: false },
          ]},
          { id: 'col-writing', title: 'Writing', color: '#FFBD65', cards: [
            { id: 'mc4', text: 'Product launch email sequence', done: false },
          ]},
          { id: 'col-pub', title: 'Published', color: '#7C3AED', cards: [
            { id: 'mc6', text: 'Homepage copy refresh', done: true },
          ]},
        ],
      },
    ],
  },
  {
    id: 'proj-personal',
    name: 'Personal',
    color: '#8B5CF6',
    ownerId: DEMO_OWNER,
    items: [
      {
        id: 'n-reading', type: 'note', x: 100, y: 80, zIndex: 1, width: 210,
        content: '📚 Reading List:\n• Thinking in Systems\n• Shape Up (Basecamp)\n• Deep Work',
        color: '#0d2a35',
      },
      {
        id: 'n-travel', type: 'note', x: 330, y: 80, zIndex: 2, width: 210,
        content: '✈️ Porto Trip\n\nFlights: Oct 15-22\nBudget: ~€800\nMust-see: Livraria Lello',
        color: '#8B5CF6',
      },
      {
        id: 'n-goals', type: 'note', x: 100, y: 290, zIndex: 1, width: 210,
        content: '🎯 2024 Goals:\n• Ship side project\n• Run a 10K race\n• Learn Portuguese\n• Read 24 books',
        color: '#FFBD65', bold: true,
      },
      {
        id: 'cl-personal', type: 'checklist', x: 330, y: 290, zIndex: 2,
        title: 'Weekly habits', color: '#0d2a35', width: 200,
        entries: [
          { id: 'ph1', text: 'Morning run (30 min)', done: false },
          { id: 'ph2', text: 'Read 30 pages', done: true },
          { id: 'ph3', text: 'Duolingo streak', done: true },
          { id: 'ph4', text: 'No social media before 9am', done: false },
        ],
      },
    ],
  },
];

const PROJECT_COLORS = ['#7C3AED', '#FFBD65', '#02A0A0', '#FF6B8A', '#059669'];

/** Every brand-new user starts with one empty board of their own. */
export function createDefaultProjectFor(userId: string): Project {
  return {
    id: 'proj-' + Math.random().toString(36).slice(2, 10),
    name: 'My Board',
    color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)] ?? '#7C3AED',
    ownerId: userId,
    items: [],
  };
}

/** Seed data for a given user: the demo user gets the sample boards above, everyone else starts fresh. */
export function seedProjectsFor(userId: string): Project[] {
  if (userId === DEMO_OWNER) return initialProjects;
  return [createDefaultProjectFor(userId)];
}
