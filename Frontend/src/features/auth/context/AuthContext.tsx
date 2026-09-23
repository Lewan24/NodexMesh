import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import type { User } from '@/entities/user/types';
import type {
  AddUserInput,
  AdminAppearanceResetScope,
  AdminProject,
  AdminProjectMember,
  AdminUser,
  AuthResult,
} from '@/features/auth/types';
import { authService } from '@/app/services';
import { errorMessage } from '@/shared/api/errors';
import { flushPendingChanges } from '@/shared/api/pendingChanges';

interface AuthContextValue {
  currentUser: User | null;
  users: User[];
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateProfile: (input: { email: string; displayName: string; currentPassword?: string }) => Promise<User>;
  changePassword: (input: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<User>;
  addUser: (input: AddUserInput) => Promise<AuthResult>;
  removeUser: (id: string) => Promise<void>;
  adminUsers: () => Promise<AdminUser[]>;
  createAdminUser: (input: {
    email: string;
    password: string;
    displayName: string;
    isAdmin: boolean;
  }) => Promise<AdminUser>;
  resetUserPassword: (id: string, password: string) => Promise<void>;
  resetUserAppearance: (id: string, scope: AdminAppearanceResetScope) => Promise<void>;
  setUserBlocked: (id: string, blocked: boolean) => Promise<void>;
  updateAdminUser: (id: string, input: { email: string; displayName: string; isAdmin: boolean }) => Promise<AdminUser>;
  restoreAdminProject: (id: string) => Promise<void>;
  purgeAdminProject: (id: string) => Promise<void>;
  adminProjects: () => Promise<AdminProject[]>;
  addProjectMember: (projectId: string, email: string, role: AdminProjectMember['role']) => Promise<AdminProjectMember>;
  removeProjectMember: (projectId: string, userId: string) => Promise<void>;
  transferProjectOwner: (projectId: string, email: string) => Promise<void>;
  registrationEnabled: () => Promise<boolean>;
  setRegistrationEnabled: (enabled: boolean) => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  useTranslation();
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

  useEffect(
    () =>
      authService.subscribeSessionExpired?.(() => {
        setCurrentUser(null);
        setUsers([]);
      }),
    [],
  );

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
      toast.error(translate('Resolve the save error or reload the board before signing out.'));
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

  const updateProfile = useCallback(async (input: { email: string; displayName: string; currentPassword?: string }) => {
    const updated = await authService.updateProfile(input);
    setCurrentUser(updated);
    return updated;
  }, []);
  const changePassword = useCallback(
    async (input: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
      const updated = await authService.changePassword(input);
      setCurrentUser(updated);
      return updated;
    },
    [],
  );

  const removeUser = useCallback(async (id: string) => {
    try {
      await authService.removeUser(id);
      setUsers(await authService.listUsers());
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, []);

  const adminUsers = useCallback(() => authService.adminUsers(), []);
  const createAdminUser = useCallback(
    (input: { email: string; password: string; displayName: string; isAdmin: boolean }) =>
      authService.createAdminUser(input),
    [],
  );
  const resetUserPassword = useCallback(
    (id: string, password: string) => authService.resetUserPassword(id, password),
    [],
  );
  const resetUserAppearance = useCallback(async (id: string, scope: AdminAppearanceResetScope) => {
    await authService.resetUserAppearance(id, scope);
    window.dispatchEvent(new CustomEvent('nodexmesh-appearance-reset', { detail: { userId: id } }));
  }, []);
  const setUserBlocked = useCallback((id: string, blocked: boolean) => authService.setUserBlocked(id, blocked), []);
  const updateAdminUser = useCallback(
    async (id: string, input: { email: string; displayName: string; isAdmin: boolean }) => {
      const updated = await authService.updateAdminUser(id, input);
      setUsers(await authService.listUsers());
      if (currentUser?.id === id) {
        setCurrentUser({
          id: updated.id,
          username: updated.email,
          name: updated.displayName,
          role: updated.isAdmin ? 'admin' : 'user',
        });
      }
      return updated;
    },
    [currentUser?.id],
  );
  const restoreAdminProject = useCallback((id: string) => authService.restoreAdminProject(id), []);
  const purgeAdminProject = useCallback((id: string) => authService.purgeAdminProject(id), []);
  const adminProjects = useCallback(() => authService.adminProjects(), []);
  const addProjectMember = useCallback(
    (projectId: string, email: string, role: AdminProjectMember['role']) =>
      authService.addProjectMember(projectId, email, role),
    [],
  );
  const removeProjectMember = useCallback(
    (projectId: string, userId: string) => authService.removeProjectMember(projectId, userId),
    [],
  );
  const transferProjectOwner = useCallback(
    (projectId: string, email: string) => authService.transferProjectOwner(projectId, email),
    [],
  );
  const registrationEnabled = useCallback(() => authService.registrationEnabled(), []);
  const setRegistrationEnabled = useCallback((enabled: boolean) => authService.setRegistrationEnabled(enabled), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      users,
      isAdmin: currentUser?.role === 'admin',
      login,
      logout,
      updateProfile,
      changePassword,
      addUser,
      removeUser,
      adminUsers,
      createAdminUser,
      resetUserPassword,
      resetUserAppearance,
      setUserBlocked,
      updateAdminUser,
      adminProjects,
      restoreAdminProject,
      purgeAdminProject,
      addProjectMember,
      removeProjectMember,
      transferProjectOwner,
      registrationEnabled,
      setRegistrationEnabled,
    }),
    [
      currentUser,
      users,
      login,
      logout,
      updateProfile,
      changePassword,
      addUser,
      removeUser,
      adminUsers,
      createAdminUser,
      resetUserPassword,
      resetUserAppearance,
      setUserBlocked,
      updateAdminUser,
      adminProjects,
      restoreAdminProject,
      purgeAdminProject,
      addProjectMember,
      removeProjectMember,
      transferProjectOwner,
      registrationEnabled,
      setRegistrationEnabled,
    ],
  );

  if (loadError)
    return (
      <div role="alert">
        {loadError}
        <button onClick={() => window.location.reload()}>{translate('Retry')}</button>
      </div>
    );
  if (!hydrated) return <div role="status">{translate('Loading session…')}</div>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
