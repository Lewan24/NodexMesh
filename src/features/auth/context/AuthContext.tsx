import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { ReactNode } from 'react';

import type { User } from '@/entities/user/types';

import type {
  AddUserInput,
  AuthResult,
} from '@/features/auth/types';

import {
  clearSession,
  loadSessionUserId,
  loadUsers,
  saveSessionUserId,
  saveUsers,
} from '@/features/auth/storage/authStorage';

import { validateNewUser } from '@/features/auth/utils/authValidation';

interface AuthContextValue {
  currentUser: User | null;
  users: User[];
  isAdmin: boolean;
  login: (
    username: string,
    password: string,
  ) => AuthResult;
  logout: () => void;
  addUser: (input: AddUserInput) => AuthResult;
  removeUser: (id: string) => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function createUserId(): string {
  return `user-${Math.random().toString(36).slice(2, 10)}`;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [users, setUsers] = useState<User[]>(() => loadUsers());

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedUserId = loadSessionUserId();

    if (savedUserId) {
      const user = users.find(item => item.id === savedUserId);

      if (user) {
        setCurrentUser(user);
      }
    }

    setHydrated(true);
  }, [users]);

  const login = useCallback(
    (username: string, password: string): AuthResult => {
      const normalizedUsername = username.trim().toLowerCase();

      const user = users.find(
        item =>
          item.username.toLowerCase() === normalizedUsername,
      );

      if (!user || user.password !== password) {
        return {
          ok: false,
          error: 'Incorrect username or password.',
        };
      }

      setCurrentUser(user);
      saveSessionUserId(user.id);

      return { ok: true };
    },
    [users],
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    clearSession();
  }, []);

  const addUser = useCallback(
    (input: AddUserInput): AuthResult => {
      const validation = validateNewUser(input, users);

      if (!validation.ok) {
        return validation;
      }

      const newUser: User = {
        id: createUserId(),
        username: input.username.trim(),
        password: input.password,
        name: input.name.trim(),
        role: input.role,
      };

      const nextUsers = [...users, newUser];

      setUsers(nextUsers);
      saveUsers(nextUsers);

      return { ok: true };
    },
    [users],
  );

  const removeUser = useCallback(
    (id: string) => {
      setUsers(previous => {
        const nextUsers = previous.filter(user => user.id !== id);

        saveUsers(nextUsers);

        return nextUsers;
      });

      if (currentUser?.id === id) {
        logout();
      }
    },
    [currentUser, logout],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      users,
      isAdmin: currentUser?.role === 'admin',
      login,
      logout,
      addUser,
      removeUser,
    }),
    [
      currentUser,
      users,
      login,
      logout,
      addUser,
      removeUser,
    ],
  );

  if (!hydrated) {
    return null;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}