import { authService } from '@/app/services';
import AdminAuditPanel from './AdminAuditPanel';
import { locale, displayLabel, translate } from '@/shared/i18n';
import LanguageSelect from '@/shared/i18n/LanguageSelect';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTheme } from '@/app/providers/ThemeProvider';
import type { AdminAppearanceResetScope, AdminProject, AdminUser } from '@/features/auth/types';
import Modal from '@/shared/components/dialogs/Modal';

export default function AdminUsersPanel({ onClose }: { onClose?: () => void }) {
  useTranslation();
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [projectUserSearch, setProjectUserSearch] = useState('');
  const [projectStatus, setProjectStatus] = useState('active');
  const [userStatus, setUserStatus] = useState('active');
  const matches = (query: string, ...values: string[]) =>
    values.some((value) => value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const filteredUsers = users.filter(
    (user) =>
      matches(userSearch, user.displayName, user.email, user.id) &&
      (userStatus === 'all' || (userStatus === 'blocked' ? user.isBlocked : !user.isBlocked)),
  );
  const filteredProjects = projects.filter(
    (project) =>
      matches(projectSearch, project.name, project.id) &&
      (projectStatus === 'all' ||
        projectStatus === (project.userDeletedAt ? 'userdeleted' : project.deletedAt ? 'trashed' : 'active')) &&
      matches(
        projectUserSearch,
        project.ownerEmail,
        project.ownerId,
        users.find((user) => user.id === project.ownerId)?.displayName ?? '',
        ...project.members.flatMap((member) => [member.email, member.displayName, member.userId]),
      ),
  );
  const [registration, setRegistration] = useState(true);
  const [tab, setTab] = useState<'users' | 'projects' | 'audit'>('users');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({ email: '', displayName: '', password: '', isAdmin: false });

  const load = async () => {
    try {
      const [nextUsers, nextProjects, enabled] = await Promise.all([
        auth.adminUsers(),
        auth.adminProjects(),
        auth.registrationEnabled(),
      ]);
      setUsers(nextUsers);
      setProjects(nextProjects);
      setRegistration(enabled);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate('Unable to load administration data.'));
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setError('');
    setMessage('');
    try {
      await action();
      await load();
      setMessage(success);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate('The operation failed.'));
      return false;
    }
  };
  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(async () => {
      await auth.createAdminUser(newUser);
      setNewUser({ email: '', displayName: '', password: '', isAdmin: false });
    }, translate('User created.'));
  };
  return (
    <main
      className="relative flex h-dvh min-h-0 flex-col overflow-hidden p-3 sm:p-6"
      style={{ backgroundColor: 'var(--color-app-bg)', color: 'var(--color-text-primary)' }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-60"
        style={{ background: 'radial-gradient(ellipse at top left, var(--color-accent-soft), transparent 70%)' }}
      />
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
        <header
          className="relative mb-5 flex shrink-0 flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl border p-4 shadow-sm sm:p-6"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="min-w-0">
            <p
              className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em]"
              style={{ color: 'var(--color-accent)' }}
            >
              NodexMesh
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{translate('Administration')}</h1>
            <p className="break-all text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {translate('Signed in as') + ' '}
              {auth.currentUser?.username}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost rounded-xl px-3 py-2 text-sm" onClick={toggleTheme}>
              {translate('Use') + ' '}
              {theme === 'light' ? 'dark' : 'light'} {' ' + translate('theme')}
            </button>
            {onClose && (
              <button className="btn-ghost rounded-xl px-3 py-2 text-sm" onClick={onClose}>
                {translate('Workspace')}
              </button>
            )}
            <button className="btn-ghost rounded-xl px-3 py-2 text-sm" onClick={() => void auth.logout()}>
              {translate('Sign out')}
            </button>
          </div>
          <LanguageSelect />
        </header>
        <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
          <div
            className="grid min-w-0 grid-cols-3 gap-2 sm:flex"
            role="tablist"
            aria-label={translate('Administration')}
          >
            {(['users', 'projects', 'audit'] as const).map((value) => (
              <button
                key={value}
                id={`admin-tab-${value}`}
                role="tab"
                aria-selected={tab === value}
                aria-controls="admin-tab-content"
                tabIndex={tab === value ? 0 : -1}
                onKeyDown={(event) => {
                  const tabs = ['users', 'projects', 'audit'] as const;
                  const index = tabs.indexOf(value);
                  const next =
                    event.key === 'ArrowRight'
                      ? (index + 1) % tabs.length
                      : event.key === 'ArrowLeft'
                        ? (index + tabs.length - 1) % tabs.length
                        : event.key === 'Home'
                          ? 0
                          : event.key === 'End'
                            ? tabs.length - 1
                            : null;
                  if (next === null) return;
                  event.preventDefault();
                  const nextTab = tabs[next];
                  if (!nextTab) return;
                  setTab(nextTab);
                  document.getElementById(`admin-tab-${nextTab}`)?.focus();
                }}
                onClick={() => setTab(value)}
                className="min-w-0 rounded-xl px-3 py-2.5 text-sm font-semibold capitalize sm:px-5"
                style={{
                  backgroundColor: tab === value ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                  color: tab === value ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                }}
              >
                {value === 'audit' ? translate('Audit') : displayLabel(value)}
              </button>
            ))}
          </div>
          <label
            className="sm:ml-auto flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <input
              type="checkbox"
              checked={registration}
              onChange={(event) =>
                void run(
                  async () => setRegistration(await auth.setRegistrationEnabled(event.target.checked)),
                  translate('Registration setting updated.'),
                )
              }
            />
            {translate('Allow registration')}
          </label>
        </div>
        <div
          key={tab}
          id="admin-tab-content"
          role="tabpanel"
          aria-labelledby={`admin-tab-${tab}`}
          tabIndex={0}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pr-1 pb-4 [scrollbar-gutter:stable]"
        >
          {(error || message) && (
            <p
              className="mb-4 rounded-xl px-3 py-2 text-sm"
              style={{
                backgroundColor: error ? 'rgba(255,107,138,.12)' : 'var(--color-accent-soft)',
                color: error ? 'var(--color-danger-strong)' : 'var(--color-accent)',
              }}
            >
              {error || message}
            </p>
          )}
          {tab === 'audit' ? (
            <AdminAuditPanel />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {tab === 'users' ? (
                  <>
                    <input
                      type="search"
                      aria-label={translate('Search users')}
                      placeholder={translate('Search users by name, email or ID')}
                      className="input-theme min-w-0 max-w-full min-w-0 basis-full sm:basis-64 flex-1 px-3 py-2 text-sm"
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                    />
                    <select
                      aria-label={translate('User status')}
                      className="input-theme min-w-0 max-w-full px-3 py-2 text-sm"
                      value={userStatus}
                      onChange={(event) => setUserStatus(event.target.value)}
                    >
                      <option value="all">{translate('All users')}</option>
                      <option value="active">{translate('Active users')}</option>
                      <option value="blocked">{translate('Blocked users')}</option>
                    </select>
                  </>
                ) : (
                  <>
                    <input
                      type="search"
                      aria-label={translate('Search projects')}
                      placeholder={translate('Search projects by name or ID')}
                      className="input-theme min-w-0 max-w-full min-w-0 basis-full sm:basis-56 flex-1 px-3 py-2 text-sm"
                      value={projectSearch}
                      onChange={(event) => setProjectSearch(event.target.value)}
                    />
                    <input
                      type="search"
                      aria-label={translate('Search project owners and members')}
                      placeholder={translate('Owner or member name, email or ID')}
                      className="input-theme min-w-0 max-w-full min-w-0 basis-full sm:basis-56 flex-1 px-3 py-2 text-sm"
                      value={projectUserSearch}
                      onChange={(event) => setProjectUserSearch(event.target.value)}
                    />
                    <select
                      aria-label={translate('Project status')}
                      className="input-theme min-w-0 max-w-full px-3 py-2 text-sm"
                      value={projectStatus}
                      onChange={(event) => setProjectStatus(event.target.value)}
                    >
                      <option value="all">{translate('All projects')}</option>
                      <option value="active">{translate('Active projects')}</option>
                      <option value="trashed">{translate('Trashed projects')}</option>
                      <option value="userdeleted">{translate('User-deleted projects')}</option>
                    </select>
                  </>
                )}
              </div>
              <p className="mb-3 text-sm" role="status">
                {tab === 'users'
                  ? translate('{{value1}} of {{value2}} users', { value1: filteredUsers.length, value2: users.length })
                  : translate('{{value1}} of {{value2}} projects', {
                      value1: filteredProjects.length,
                      value2: projects.length,
                    })}
              </p>
              {tab === 'users' ? (
                <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                  <div className="min-w-0 rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface)' }}>
                    <h2 className="mb-3 font-semibold">{translate('Users')}</h2>
                    <div className="space-y-2" role="region" aria-label={translate('Users list')} tabIndex={0}>
                      {filteredUsers.map((user) => (
                        <AdminUserRow
                          key={user.id}
                          user={user}
                          currentUserId={auth.currentUser?.id}
                          onSave={(input) =>
                            run(() => auth.updateAdminUser(user.id, input), translate('User updated.'))
                          }
                          onResetPassword={(password) =>
                            run(() => auth.resetUserPassword(user.id, password), translate('Password reset.'))
                          }
                          onResetAppearance={(scope) =>
                            run(() => auth.resetUserAppearance(user.id, scope), translate('User appearance reset.'))
                          }
                          onRestore={() =>
                            run(
                              () => authService.restoreAccount(user.id),
                              translate('Account restored. Project changes remain in effect.'),
                            )
                          }
                          onPurge={() =>
                            run(() => authService.purgeAccount(user.id), translate('Account permanently deleted.'))
                          }
                          onToggleBlocked={() =>
                            run(
                              () => auth.setUserBlocked(user.id, !user.isBlocked),
                              user.isBlocked ? translate('User unblocked.') : translate('User blocked.'),
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <form
                    onSubmit={createUser}
                    className="min-w-0 space-y-3 self-start rounded-2xl p-4"
                    style={{ backgroundColor: 'var(--color-surface)' }}
                  >
                    <h2 className="font-semibold">{translate('Create user')}</h2>
                    {(['email', 'displayName', 'password'] as const).map((field) => (
                      <input
                        key={field}
                        required
                        value={newUser[field]}
                        onChange={(event) => setNewUser({ ...newUser, [field]: event.target.value })}
                        type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                        placeholder={
                          field === 'displayName'
                            ? translate('Display name')
                            : translate(field === 'email' ? 'Email' : 'Password')
                        }
                        className="input-theme min-w-0 max-w-full w-full px-3 py-2 text-sm"
                      />
                    ))}
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newUser.isAdmin}
                        onChange={(event) => setNewUser({ ...newUser, isAdmin: event.target.checked })}
                      />
                      {translate('Administrator')}
                    </label>
                    <button className="btn-accent w-full rounded-xl px-3 py-2 text-sm font-semibold">
                      {translate('Create user')}
                    </button>
                  </form>
                </section>
              ) : (
                <section
                  className="min-w-0 space-y-4"
                  role="region"
                  aria-label={translate('Projects list')}
                  tabIndex={0}
                >
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      users={users}
                      onRestore={() => run(() => auth.restoreAdminProject(project.id), translate('Project restored.'))}
                      onPurge={() =>
                        run(() => auth.purgeAdminProject(project.id), translate('Project permanently deleted.'))
                      }
                      onAdd={(email, role) =>
                        void run(() => auth.addProjectMember(project.id, email, role), translate('Member added.'))
                      }
                      onRemove={(userId) =>
                        void run(() => auth.removeProjectMember(project.id, userId), translate('Member removed.'))
                      }
                      onTransferOwner={(email) =>
                        void run(
                          () => auth.transferProjectOwner(project.id, email),
                          translate('Project owner changed.'),
                        )
                      }
                    />
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function AdminUserRow({
  user,
  currentUserId,
  onSave,
  onResetPassword,
  onResetAppearance,
  onToggleBlocked,
  onRestore,
  onPurge,
}: {
  user: AdminUser;
  currentUserId?: string;
  onSave: (input: { email: string; displayName: string; isAdmin: boolean }) => Promise<boolean>;
  onResetPassword: (password: string) => Promise<boolean>;
  onResetAppearance: (scope: AdminAppearanceResetScope) => Promise<boolean>;
  onToggleBlocked: () => Promise<boolean>;
  onRestore: () => Promise<boolean>;
  onPurge: () => Promise<boolean>;
}) {
  useTranslation();
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [dialog, setDialog] = useState<'edit' | 'password' | 'appearance' | null>(null);
  const [resetScope, setResetScope] = useState<AdminAppearanceResetScope>('Defaults');
  const [password, setPassword] = useState('');
  const [draft, setDraft] = useState({ email: user.email, displayName: user.displayName, isAdmin: user.isAdmin });

  return (
    <>
      <div
        className="group flex flex-wrap items-center gap-3 rounded-2xl border p-3 transition-colors"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold"
          style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
        >
          {user.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{user.displayName}</p>
          <p className="truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {user.email}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              backgroundColor: user.isBlocked ? 'rgba(255,107,138,.12)' : 'var(--color-accent-soft)',
              color: user.isBlocked ? 'var(--color-danger-strong)' : 'var(--color-accent)',
            }}
          >
            {user.deletionRequestedAt
              ? translate('Pending deletion')
              : user.isBlocked
                ? translate('Blocked')
                : user.isAdmin
                  ? translate('Administrator')
                  : translate('User')}
          </span>
          <button className="btn-ghost rounded-lg px-2.5 py-1.5 text-xs" onClick={() => setDialog('edit')}>
            {translate('Edit')}
          </button>
          <button className="btn-ghost rounded-lg px-2.5 py-1.5 text-xs" onClick={() => setDialog('password')}>
            {translate('Reset password')}
          </button>
          <button className="btn-ghost rounded-lg px-2.5 py-1.5 text-xs" onClick={() => setDialog('appearance')}>
            {translate('Reset appearance')}
          </button>
          {user.deletionRequestedAt && (
            <div className="w-full space-y-2 text-xs">
              <p>
                {translate('Scheduled for permanent deletion:')}{' '}
                {user.permanentDeletionAt ? new Date(user.permanentDeletionAt).toLocaleDateString(locale()) : ''}
              </p>
              <p>{translate('Restoring the account does not undo project changes or restore memberships.')}</p>
              <button
                disabled={accountBusy}
                className="btn-accent rounded-lg px-3 py-2"
                onClick={async () => {
                  setAccountBusy(true);
                  try {
                    await onRestore();
                  } finally {
                    setAccountBusy(false);
                  }
                }}
              >
                {translate('Restore account')}
              </button>
              <button
                disabled={accountBusy}
                className="btn-ghost rounded-lg px-3 py-2"
                onClick={() => setPurgeOpen(true)}
              >
                {translate('Delete permanently')}
              </button>
            </div>
          )}
          {user.isBlocked && !user.deletionRequestedAt && user.id !== currentUserId && (
            <button
              disabled={accountBusy}
              className="btn-ghost rounded-lg px-3 py-2 text-xs"
              onClick={() => setPurgeOpen(true)}
            >
              {translate('Delete permanently')}
            </button>
          )}
          {user.id !== currentUserId && !user.deletionRequestedAt && (
            <button
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold"
              style={{ color: user.isBlocked ? 'var(--color-success)' : 'var(--color-danger-strong)' }}
              onClick={() => void onToggleBlocked()}
            >
              {user.isBlocked ? translate('Unblock') : translate('Block')}
            </button>
          )}
        </div>
      </div>
      {purgeOpen && (
        <ConfirmProjectDialog
          title={translate('Permanently delete this account? This cannot be undone.')}
          onCancel={() => {
            if (!accountBusy) setPurgeOpen(false);
          }}
          onConfirm={async () => {
            if (accountBusy) return;
            setAccountBusy(true);
            try {
              if (await onPurge()) setPurgeOpen(false);
            } finally {
              setAccountBusy(false);
            }
          }}
        />
      )}
      {dialog && (
        <Modal
          onClose={() => setDialog(null)}
          centered
          label={
            dialog === 'edit'
              ? translate('Edit')
              : dialog === 'password'
                ? translate('Reset password')
                : translate('Reset appearance')
          }
        >
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(8,16,20,.58)', backdropFilter: 'blur(5px)' }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setDialog(null);
            }}
          >
            <section
              className="w-full max-w-md rounded-3xl border p-5 shadow-2xl"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <p
                className="mb-1 text-[10px] font-bold uppercase tracking-[.2em]"
                style={{ color: 'var(--color-accent)' }}
              >
                NodexMesh · {translate('Administration')}
              </p>
              <h2 className="mb-4 text-xl font-bold">
                {dialog === 'edit'
                  ? translate('Edit')
                  : dialog === 'password'
                    ? translate('Reset password')
                    : translate('Reset appearance')}
              </h2>
              {dialog === 'edit' ? (
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void onSave(draft).then((saved) => {
                      if (saved) setDialog(null);
                    });
                  }}
                >
                  <input
                    required
                    maxLength={100}
                    aria-label={translate('Display name')}
                    className="input-theme min-w-0 max-w-full px-3 py-2 text-sm"
                    value={draft.displayName}
                    onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
                  />
                  <input
                    required
                    type="email"
                    aria-label={translate('Email address')}
                    disabled={user.id === currentUserId}
                    className="input-theme min-w-0 max-w-full px-3 py-2 text-sm"
                    value={draft.email}
                    onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                  />
                  <select
                    aria-label={translate('Application role')}
                    disabled={user.id === currentUserId}
                    className="input-theme min-w-0 max-w-full px-3 py-2 text-sm"
                    value={draft.isAdmin ? 'admin' : 'user'}
                    onChange={(event) => setDraft({ ...draft, isAdmin: event.target.value === 'admin' })}
                  >
                    <option value="user">{translate('User')}</option>
                    <option value="admin">{translate('Administrator')}</option>
                  </select>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      className="btn-ghost rounded-xl px-4 py-2 text-sm"
                      onClick={() => {
                        setDraft({ email: user.email, displayName: user.displayName, isAdmin: user.isAdmin });
                        setDialog(null);
                      }}
                    >
                      {translate('Cancel')}
                    </button>
                    <button className="btn-accent rounded-xl px-4 py-2 text-sm font-semibold">
                      {translate('Save changes')}
                    </button>
                  </div>
                </form>
              ) : dialog === 'password' ? (
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void onResetPassword(password).then((saved) => {
                      if (saved) {
                        setPassword('');
                        setDialog(null);
                      }
                    });
                  }}
                >
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {user.email}
                  </p>
                  <label className="block text-sm font-medium">
                    {translate('New password for {{value1}} (12+ characters):', { value1: user.email })}
                  </label>
                  <input
                    autoFocus
                    required
                    minLength={12}
                    type="password"
                    className="input-theme w-full px-3 py-2.5 text-sm"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      className="btn-ghost rounded-xl px-4 py-2 text-sm"
                      onClick={() => setDialog(null)}
                    >
                      {translate('Cancel')}
                    </button>
                    <button className="btn-accent rounded-xl px-4 py-2 text-sm font-semibold">
                      {translate('Reset password')}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {translate('Choose which appearance settings to reset for {{value1}}.', { value1: user.email })}
                  </p>
                  <select
                    aria-label={translate('Appearance reset scope for {{value1}}', { value1: user.email })}
                    className="input-theme w-full px-3 py-2.5 text-sm"
                    value={resetScope}
                    onChange={(event) => setResetScope(event.target.value as AdminAppearanceResetScope)}
                  >
                    <option value="Defaults">{translate('Global defaults')}</option>
                    <option value="ProjectOverrides">{translate('Project overrides')}</option>
                    <option value="All">{translate('All appearance')}</option>
                  </select>
                  <div className="flex justify-end gap-2 pt-2">
                    <button className="btn-ghost rounded-xl px-4 py-2 text-sm" onClick={() => setDialog(null)}>
                      {translate('Cancel')}
                    </button>
                    <button
                      className="btn-accent rounded-xl px-4 py-2 text-sm font-semibold"
                      onClick={() =>
                        void onResetAppearance(resetScope).then((saved) => {
                          if (saved) setDialog(null);
                        })
                      }
                    >
                      {translate('Reset')}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </Modal>
      )}
    </>
  );
}

function ProjectCard({
  project,
  users,
  onAdd,
  onRemove,
  onTransferOwner,
  onRestore,
  onPurge,
}: {
  project: AdminProject;
  users: AdminUser[];
  onAdd: (email: string, role: 'Editor' | 'Commenter' | 'Viewer') => void;
  onRemove: (id: string) => void;
  onTransferOwner: (email: string) => void;
  onRestore: () => Promise<boolean>;
  onPurge: () => Promise<boolean>;
}) {
  useTranslation();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Editor' | 'Commenter' | 'Viewer'>('Viewer');
  const [nextOwnerEmail, setNextOwnerEmail] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (project.deletedAt || project.userDeletedAt)
    return (
      <article
        className="min-w-0 break-words rounded-2xl border p-4"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="opacity-60" aria-disabled="true">
          <h2 className="font-semibold">{project.name}</h2>
          <p className="text-sm">
            {translate('Owner:') + ' '}
            {project.ownerEmail} · {project.userDeletedAt ? translate('User-deleted') : translate('Trashed')}
          </p>
          <p className="mt-2 text-xs">
            {project.members.map((member) => `${member.email} (${displayLabel(member.role)})`).join(' · ') ||
              translate('No members')}
          </p>
          <p className="mt-2 text-xs">{translate('Restore this project to change ownership or membership.')}</p>
          {project.userDeletedAt && (
            <p className="mt-2 text-xs">
              {translate('Scheduled for permanent deletion:')}{' '}
              {new Date(new Date(project.userDeletedAt).getTime() + 30 * 86400000).toLocaleDateString(locale())}
            </p>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            className="btn-accent rounded-lg px-3 py-2 text-sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onRestore();
              } finally {
                setBusy(false);
              }
            }}
          >
            {translate('Restore project')}
          </button>
          <button className="btn-ghost rounded-lg px-3 py-2 text-sm" disabled={busy} onClick={() => setPurgeOpen(true)}>
            {translate('Delete permanently')}
          </button>
        </div>
        {purgeOpen && (
          <ConfirmProjectDialog
            title={translate('Permanently delete “{{value1}}” and all its boards? This cannot be undone.', {
              value1: project.name,
            })}
            onCancel={() => setPurgeOpen(false)}
            onConfirm={async () => {
              setBusy(true);
              try {
                if (await onPurge()) setPurgeOpen(false);
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
      </article>
    );
  return (
    <article
      className="min-w-0 break-words rounded-2xl border p-4"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h2 className="font-semibold">{project.name}</h2>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {translate('Owner:') + ' '}
            {project.ownerEmail}
            {project.deletedAt ? ' ' + translate('· trashed') : ''}
          </p>
        </div>
        <form
          className="flex w-full flex-wrap gap-2 sm:w-auto"
          onSubmit={(event) => {
            event.preventDefault();
            onAdd(email, role);
            setEmail('');
          }}
        >
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="user@example.com"
            className="input-theme min-w-0 max-w-full min-w-0 flex-1 px-2 py-1 text-xs sm:flex-none"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as typeof role)}
            className="input-theme min-w-0 max-w-full px-2 py-1 text-xs"
          >
            <option value="Viewer">{translate('Viewer')}</option>
            <option value="Commenter">{translate('Commenter')}</option>
            <option value="Editor">{translate('Editor')}</option>
          </select>
          <button className="btn-accent rounded-lg px-2 py-1 text-xs">{translate('Add')}</button>
        </form>
      </div>
      <button
        className="btn-ghost mt-3 rounded-xl border px-3 py-2 text-xs font-semibold"
        style={{ borderColor: 'var(--color-border)' }}
        onClick={() => setTransferOpen(true)}
      >
        {translate('Change owner')}
      </button>
      {transferOpen && (
        <Modal onClose={() => setTransferOpen(false)} centered label={translate('Change owner')}>
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(8,16,20,.58)', backdropFilter: 'blur(5px)' }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setTransferOpen(false);
            }}
          >
            <form
              className="w-full max-w-md space-y-4 rounded-3xl border p-5 shadow-2xl"
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              onSubmit={(event) => {
                event.preventDefault();
                onTransferOwner(nextOwnerEmail);
                setNextOwnerEmail('');
                setTransferOpen(false);
              }}
            >
              <div>
                <p
                  className="mb-1 text-[10px] font-bold uppercase tracking-[.2em]"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {translate('Project')}
                </p>
                <h2 className="text-xl font-bold">{translate('Change owner')}</h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {project.name}
                </p>
              </div>
              <select
                required
                className="input-theme w-full px-3 py-2.5 text-sm"
                value={nextOwnerEmail}
                onChange={(event) => setNextOwnerEmail(event.target.value)}
              >
                <option value="">{translate('Select a user')}</option>
                {users
                  .filter((user) => !user.isBlocked && user.id !== project.ownerId)
                  .map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.displayName} · {user.email}
                    </option>
                  ))}
              </select>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {translate('The current owner remains an Editor.')}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-ghost rounded-xl px-4 py-2 text-sm"
                  onClick={() => setTransferOpen(false)}
                >
                  {translate('Cancel')}
                </button>
                <button className="btn-accent rounded-xl px-4 py-2 text-sm font-semibold">
                  {translate('Transfer ownership')}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {project.members.map((member) => (
          <span
            key={member.userId}
            className="inline-flex items-center gap-2 rounded-lg border px-2 py-1 text-xs"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {member.email} · {displayLabel(member.role)}
            <button
              onClick={() => onRemove(member.userId)}
              aria-label={translate('Remove {{value1}}', { value1: member.email })}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </article>
  );
}

function ConfirmProjectDialog({
  title,
  onCancel,
  onConfirm,
}: {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal onClose={onCancel} centered label={translate('Delete permanently')}>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(8,16,20,.58)', backdropFilter: 'blur(5px)' }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onCancel();
        }}
      >
        <section
          className="w-full max-w-sm rounded-3xl border p-5 shadow-2xl"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <h2 className="text-lg font-bold">{translate('Delete permanently')}</h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {title}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-ghost rounded-xl px-4 py-2 text-sm" onClick={onCancel}>
              {translate('Cancel')}
            </button>
            <button
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--color-danger-strong)' }}
              onClick={onConfirm}
            >
              {translate('Delete permanently')}
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
