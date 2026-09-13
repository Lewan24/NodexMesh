import { User } from './types';

export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000002';
export const ADMIN_USER_ID = '00000000-0000-4000-8000-000000000001';

export const initialUsers: (User & { password: string })[] = [
  { id: ADMIN_USER_ID, username: 'admin', password: 'admin123', name: 'Admin', role: 'admin' },
  { id: DEMO_USER_ID, username: 'demo', password: 'demo123', name: 'Demo User', role: 'user' },
];
