import type { User } from '@/entities/user/types';
import { initialUsers } from '@/entities/user/mockUsers';

const USERS_KEY = 'nodexmesh_users';
const SESSION_KEY = 'nodexmesh_session_user_id';

export function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);

    if (raw) {
      const users = JSON.parse(raw) as User[];

      if (Array.isArray(users)) {
        return users;
      }
    }
  } catch {
    // Fall back to initial users.
  }

  saveUsers(initialUsers);

  return initialUsers;
}

export function saveUsers(users: User[]): void {
  localStorage.setItem(
    USERS_KEY,
    JSON.stringify(users),
  );
}

export function loadSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function saveSessionUserId(
  userId: string,
): void {
  localStorage.setItem(
    SESSION_KEY,
    userId,
  );
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}