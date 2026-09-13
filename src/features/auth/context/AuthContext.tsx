import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import type { User } from '@/entities/user/types';
import type { AddUserInput, AuthResult } from '@/features/auth/types';
import { authService } from '@/app/services';
import { errorMessage } from '@/shared/api/errors';
import { flushPendingChanges } from '@/shared/api/pendingChanges';

interface AuthContextValue {
  currentUser: User | null;
  users: User[];
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  addUser: (input: AddUserInput) => Promise<AuthResult>;
  removeUser: (id: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    void authService
      .me()
      .then(async (user) => {
        const accounts = user?.role === 'admin' ? await authService.listUsers() : [];
        if (active) {
          setCurrentUser(user);
          setUsers(accounts);
          setHydrated(true);
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    try {
      const user = await authService.login({ username, password });
      const accounts = user.role === 'admin' ? await authService.listUsers() : [];
      setUsers(accounts);
      setCurrentUser(user);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }, []);

  const logout = useCallback(async () => {
    if (!(await flushPendingChanges())) {
      toast.error('Resolve the save error or reload the board before signing out.');
      return;
    }
    try {
      await authService.logout();
      setCurrentUser(null);
      setUsers([]);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, []);

  const addUser = useCallback(async (input: AddUserInput): Promise<AuthResult> => {
    try {
      await authService.addUser(input);
      setUsers(await authService.listUsers());
      return { ok: true };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  }, []);

  const removeUser = useCallback(async (id: string) => {
    try {
      await authService.removeUser(id);
      setUsers(await authService.listUsers());
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ currentUser, users, isAdmin: currentUser?.role === 'admin', login, logout, addUser, removeUser }),
    [currentUser, users, login, logout, addUser, removeUser],
  );

  if (loadError)
    return (
      <div role="alert">
        {loadError}
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  if (!hydrated) return <div role="status">Loading session…</div>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
