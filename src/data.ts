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
        id: 'f-ideation', type: 'frame', x: 40, y: 24, zIndex: 0,
        title: 'Ideation', width: 560, height: 210, color: '#FFBD65',
      },
      {
        id: 'n-goal', type: 'note', x: 60, y: 60, zIndex: 1, width: 220,
        content: '🎯 Goal: Redesign the onboarding\n\nFocus on first-time user experience and cut time-to-value in half.',
        color: '#0d2a35',
      },
      {
        id: 'n-research', type: 'note', x: 300, y: 44, zIndex: 2, width: 220,
        content: '🔍 Research:\n• User interviews ×8\n• Competitor analysis\n• Heatmap review\n• Session recordings',
        color: '#0d2a35',
      },
      {
        id: 'k-sprint', type: 'kanban', x: 60, y: 280, zIndex: 3,
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
            { id: 'c6', text: 'Project kickoff', done: true },
            { id: 'c7', text: 'Stakeholder alignment', done: true },
          ]},
        ],
      },
      {
        id: 'col-resources', type: 'column', x: 700, y: 44, zIndex: 2,
        title: 'Resources', color: '#f0f9ff', width: 320,
        items: [
          {
            id: 'ci1', type: 'note', x: 0, y: 0, zIndex: 1, width: 240,
            content: '📁 Figma design file — main workspace\n\nCheck the shared library.',
            color: '#fefce8', topColor: '#7C3AED',
          },
          {
            id: 'ci2', type: 'link', x: 0, y: 0, zIndex: 1,
            url: 'https://notion.so', title: 'User research repo',
            description: 'All interview notes and synthesis docs',
          },
          {
            id: 'ci3', type: 'note', x: 0, y: 0, zIndex: 1, width: 240,
            content: '🎨 Brand guidelines\n\nColors, typography, tone of voice',
            color: '#fff7ed', topColor: '#FFBD65',
          },
          {
            id: 'ci4', type: 'checklist', x: 0, y: 0, zIndex: 1,
            title: 'Assets needed', color: '#f0fdf4', width: 200,
            entries: [
              { id: 'ca1', text: 'Icons export (SVG)', done: true },
              { id: 'ca2', text: 'Photo library', done: false },
              { id: 'ca3', text: 'Component docs', done: false },
            ],
          },
        ],
      },
      {
        id: 'cl-design', type: 'checklist', x: 1020, y: 44, zIndex: 2,
        title: 'Design Checklist', color: '#0d2a35', width: 200,
        entries: [
          { id: 'de1', text: 'Typography scale defined', done: true },
          { id: 'de2', text: 'Component library', done: true },
          { id: 'de3', text: 'Accessibility audit', done: false },
          { id: 'de4', text: 'Dark mode tokens', done: false },
          { id: 'de5', text: 'Export assets', done: false },
        ],
      },
      {
        id: 'line-1', type: 'line', x: 180, y: 252, zIndex: 2,
        x2: 180, y2: 278,
        arrowStart: false, arrowEnd: true,
        color: '#FFBD65', strokeWidth: 2,
      },
      {
        id: 'img-moodboard', type: 'image', x: 1020, y: 260, zIndex: 2,
        url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=280&h=190&fit=crop&auto=format',
        caption: 'Moodboard reference',
        width: 240, imgHeight: 160,
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
