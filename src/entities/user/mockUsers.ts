import { User } from "./types";

export const DEMO_USER_ID = 'user-demo';
export const ADMIN_USER_ID = 'user-admin';

export const initialUsers: User[] = [
  {
    id: ADMIN_USER_ID,
    username: 'admin',
    password: 'admin123',
    name: 'Admin',
    role: 'admin',
  },
  {
    id: DEMO_USER_ID,
    username: 'demo',
    password: 'demo123',
    name: 'Demo User',
    role: 'user',
  },
];