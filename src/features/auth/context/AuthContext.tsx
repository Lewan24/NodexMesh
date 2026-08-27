import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { User, Role } from '@/data/types';
import { initialUsers } from '@/data/data';

/**
 * ── Mock auth ────────────────────────────────────────────────────────────
 * This stands in for a real backend. Everything is persisted to
 * localStorage so refreshes don't lose state. Swap the bodies of
 * `login` / `addUser` / `removeUser` for real API calls once the
 * backend exists — the context shape can stay the same.
 *
 * By design there is no self sign-up: only an existing admin can create
 * accounts (see `addUser`).
 */

const USERS_KEY = 'nodexmesh_users';
const SESSION_KEY = 'nodexmesh_session_user_id';

const uid = () => 'user-' + Math.random().toString(36).slice(2, 10);

function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw) as User[];
  } catch {
    /* fall through to seed */
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
  return initialUsers;
}

function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

interface AuthContextValue {
  currentUser: User | null;
  users: User[];
  isAdmin: boolean;
  login: (username: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
  addUser: (input: { username: string; password: string; name: string; role: Role }) => { ok: true } | { ok: false; error: string };
  removeUser: (id: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore session on load
  useEffect(() => {
    const savedId = localStorage.getItem(SESSION_KEY);
    if (savedId) {
      const found = users.find(u => u.id === savedId);
      if (found) setCurrentUser(found);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback((username: string, password: string): { ok: true } | { ok: false; error: string } => {
    const match = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!match || match.password !== password) {
      return { ok: false, error: 'Incorrect username or password.' };
    }
    setCurrentUser(match);
    localStorage.setItem(SESSION_KEY, match.id);
    return { ok: true };
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  const addUser = useCallback((input: { username: string; password: string; name: string; role: Role }): { ok: true } | { ok: false; error: string } => {
    const uname = input.username.trim();
    if (!uname || !input.password || !input.name.trim()) {
      return { ok: false, error: 'All fields are required.' };
    }
    if (users.some(u => u.username.toLowerCase() === uname.toLowerCase())) {
      return { ok: false, error: 'That username is already taken.' };
    }
    const newUser: User = { id: uid(), username: uname, password: input.password, name: input.name.trim(), role: input.role };
    const next = [...users, newUser];
    setUsers(next);
    saveUsers(next);
    return { ok: true };
  }, [users]);

  const removeUser = useCallback((id: string) => {
    setUsers(prev => {
      const next = prev.filter(u => u.id !== id);
      saveUsers(next);
      return next;
    });
    if (currentUser?.id === id) logout();
  }, [currentUser, logout]);

  const value = useMemo<AuthContextValue>(() => ({
    currentUser,
    users,
    isAdmin: currentUser?.role === 'admin',
    login,
    logout,
    addUser,
    removeUser,
  }), [currentUser, users, login, logout, addUser, removeUser]);

  // Avoid a flash of the login screen before we've checked localStorage
  if (!hydrated) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
