import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTheme } from '@/app/providers/ThemeProvider';
import type { AdminAppearanceResetScope, AdminProject, AdminUser } from '@/features/auth/types';

export default function AdminUsersPanel({ onClose }: { onClose?: () => void }) {
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [projectUserSearch, setProjectUserSearch] = useState('');
  const [projectStatus, setProjectStatus] = useState('all');
  const [userStatus, setUserStatus] = useState('all');
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
  const [tab, setTab] = useState<'users' | 'projects'>('users');
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
      setError(cause instanceof Error ? cause.message : 'Unable to load administration data.');
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
      setError(cause instanceof Error ? cause.message : 'The operation failed.');
      return false;
    }
  };
  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(async () => {
      await auth.createAdminUser(newUser);
      setNewUser({ email: '', displayName: '', password: '', isAdmin: false });
    }, 'User created.');
  };
  const resetPassword = (user: AdminUser) => {
    const password = window.prompt(`New password for ${user.email} (12+ characters):`);
    if (password) void run(() => auth.resetUserPassword(user.id, password), 'Password reset.');
  };

  return (
    <main
      className="min-h-dvh p-4 sm:p-8"
      style={{ backgroundColor: 'var(--color-app-bg)', color: 'var(--color-text-primary)' }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--color-accent)' }}>
              NodexMesh
            </p>
            <h1 className="text-2xl font-bold">Administration</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Signed in as {auth.currentUser?.username}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost rounded-xl px-3 py-2 text-sm" onClick={toggleTheme}>
              Use {theme === 'light' ? 'dark' : 'light'} theme
            </button>
            {onClose && (
              <button className="btn-ghost rounded-xl px-3 py-2 text-sm" onClick={onClose}>
                Workspace
              </button>
            )}
            <button className="btn-ghost rounded-xl px-3 py-2 text-sm" onClick={() => void auth.logout()}>
              Sign out
            </button>
          </div>
        </header>
        <div className="mb-4 flex flex-wrap gap-2">
          {(['users', 'projects'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className="rounded-xl px-4 py-2 text-sm font-semibold capitalize"
              style={{
                backgroundColor: tab === value ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                color: tab === value ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              }}
            >
              {value}
            </button>
          ))}
          <label
            className="ml-auto flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <input
              type="checkbox"
              checked={registration}
              onChange={(event) =>
                void run(
                  async () => setRegistration(await auth.setRegistrationEnabled(event.target.checked)),
                  'Registration setting updated.',
                )
              }
            />
            Allow registration
          </label>
        </div>
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
        <div className="mb-4 flex flex-wrap gap-2">
          {tab === 'users' ? (
            <>
              <input
                type="search"
                aria-label="Search users"
                placeholder="Search users by name, email or ID"
                className="input-theme min-w-64 flex-1 px-3 py-2 text-sm"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
              />
              <select
                aria-label="User status"
                className="input-theme px-3 py-2 text-sm"
                value={userStatus}
                onChange={(event) => setUserStatus(event.target.value)}
              >
                <option value="all">All users</option>
                <option value="active">Active users</option>
                <option value="blocked">Blocked users</option>
              </select>
            </>
          ) : (
            <>
              <input
                type="search"
                aria-label="Search projects"
                placeholder="Search projects by name or ID"
                className="input-theme min-w-56 flex-1 px-3 py-2 text-sm"
                value={projectSearch}
                onChange={(event) => setProjectSearch(event.target.value)}
              />
              <input
                type="search"
                aria-label="Search project owners and members"
                placeholder="Owner or member name, email or ID"
                className="input-theme min-w-56 flex-1 px-3 py-2 text-sm"
                value={projectUserSearch}
                onChange={(event) => setProjectUserSearch(event.target.value)}
              />
              <select
                aria-label="Project status"
                className="input-theme px-3 py-2 text-sm"
                value={projectStatus}
                onChange={(event) => setProjectStatus(event.target.value)}
              >
                <option value="all">All projects</option>
                <option value="active">Active projects</option>
                <option value="trashed">Trashed projects</option>
                <option value="userdeleted">User-deleted projects</option>
              </select>
            </>
          )}
        </div>
        <p className="mb-3 text-sm" role="status">
          {tab === 'users'
            ? `${filteredUsers.length} of ${users.length} users`
            : `${filteredProjects.length} of ${projects.length} projects`}
        </p>
        {tab === 'users' ? (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0 rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface)' }}>
              <h2 className="mb-3 font-semibold">Users</h2>
              <div
                className="max-h-[min(58dvh,42rem)] space-y-2 overflow-y-auto overscroll-contain pr-1"
                role="region"
                aria-label="Users list"
                tabIndex={0}
              >
                {filteredUsers.map((user) => (
                  <AdminUserRow
                    key={user.id}
                    user={user}
                    currentUserId={auth.currentUser?.id}
                    onSave={(input) => run(() => auth.updateAdminUser(user.id, input), 'User updated.')}
                    onResetPassword={() => resetPassword(user)}
                    onResetAppearance={(scope) => {
                      const label =
                        scope === 'Defaults'
                          ? 'global appearance settings'
                          : scope === 'ProjectOverrides'
                            ? 'project appearance overrides'
                            : 'all appearance settings';
                      if (!window.confirm(`Reset ${label} for ${user.email}?`)) return;
                      void run(() => auth.resetUserAppearance(user.id, scope), 'User appearance reset.');
                    }}
                    onToggleBlocked={() =>
                      run(
                        () => auth.setUserBlocked(user.id, !user.isBlocked),
                        user.isBlocked ? 'User unblocked.' : 'User blocked.',
                      )
                    }
                  />
                ))}
              </div>
            </div>
            <form
              onSubmit={createUser}
              className="space-y-3 rounded-2xl p-4"
              style={{ backgroundColor: 'var(--color-surface)' }}
            >
              <h2 className="font-semibold">Create user</h2>
              {(['email', 'displayName', 'password'] as const).map((field) => (
                <input
                  key={field}
                  required
                  value={newUser[field]}
                  onChange={(event) => setNewUser({ ...newUser, [field]: event.target.value })}
                  type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  placeholder={
                    field === 'displayName' ? 'Display name' : field.charAt(0).toUpperCase() + field.slice(1)
                  }
                  className="input-theme w-full px-3 py-2 text-sm"
                />
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newUser.isAdmin}
                  onChange={(event) => setNewUser({ ...newUser, isAdmin: event.target.checked })}
                />
                Administrator
              </label>
              <button className="btn-accent w-full rounded-xl px-3 py-2 text-sm font-semibold">Create user</button>
            </form>
          </section>
        ) : (
          <section
            className="max-h-[calc(100dvh-13rem)] space-y-4 overflow-y-auto overscroll-contain pr-1 pb-2 sm:max-h-[calc(100dvh-14rem)]"
            role="region"
            aria-label="Projects list"
            tabIndex={0}
          >
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                users={users}
                onRestore={() => run(() => auth.restoreAdminProject(project.id), 'Project restored.')}
                onPurge={() => run(() => auth.purgeAdminProject(project.id), 'Project permanently deleted.')}
                onAdd={(email, role) => void run(() => auth.addProjectMember(project.id, email, role), 'Member added.')}
                onRemove={(userId) => void run(() => auth.removeProjectMember(project.id, userId), 'Member removed.')}
                onTransferOwner={(email) =>
                  void run(() => auth.transferProjectOwner(project.id, email), 'Project owner changed.')
                }
              />
            ))}
          </section>
        )}
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
}: {
  user: AdminUser;
  currentUserId?: string;
  onSave: (input: { email: string; displayName: string; isAdmin: boolean }) => Promise<boolean>;
  onResetPassword: () => void;
  onResetAppearance: (scope: AdminAppearanceResetScope) => void;
  onToggleBlocked: () => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [resetScope, setResetScope] = useState<AdminAppearanceResetScope>('Defaults');
  const [draft, setDraft] = useState({ email: user.email, displayName: user.displayName, isAdmin: user.isAdmin });

  if (editing) {
    return (
      <form
        className="grid gap-2 rounded-xl p-3 sm:grid-cols-[1fr_1fr_auto]"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px dashed var(--color-border)' }}
        onSubmit={(event) => {
          event.preventDefault();
          void onSave(draft).then((saved) => {
            if (saved) setEditing(false);
          });
        }}
      >
        <input
          required
          maxLength={100}
          aria-label="Display name"
          className="input-theme px-3 py-2 text-sm"
          value={draft.displayName}
          onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
        />
        <input
          required
          type="email"
          aria-label="Email address"
          disabled={user.id === currentUserId}
          className="input-theme px-3 py-2 text-sm"
          value={draft.email}
          onChange={(event) => setDraft({ ...draft, email: event.target.value })}
        />
        <select
          aria-label="Application role"
          disabled={user.id === currentUserId}
          className="input-theme px-3 py-2 text-sm"
          value={draft.isAdmin ? 'admin' : 'user'}
          onChange={(event) => setDraft({ ...draft, isAdmin: event.target.value === 'admin' })}
        >
          <option value="user">User</option>
          <option value="admin">Administrator</option>
        </select>
        <div className="flex gap-2 sm:col-span-3 sm:justify-end">
          <button
            type="button"
            className="btn-ghost rounded-lg px-3 py-1.5 text-xs"
            onClick={() => {
              setDraft({ email: user.email, displayName: user.displayName, isAdmin: user.isAdmin });
              setEditing(false);
            }}
          >
            Cancel
          </button>
          <button className="btn-accent rounded-lg px-3 py-1.5 text-xs font-semibold">Save changes</button>
        </div>
      </form>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-xl p-3"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium">{user.displayName}</p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {user.email} · {user.isAdmin ? 'admin' : 'user'}
          {user.isBlocked ? ' · blocked' : ''}
        </p>
      </div>
      <button className="btn-ghost rounded-lg px-2 py-1 text-xs" onClick={() => setEditing(true)}>
        Edit
      </button>
      <button className="btn-ghost rounded-lg px-2 py-1 text-xs" onClick={onResetPassword}>
        Reset password
      </button>
      <div className="flex max-w-full flex-wrap items-center gap-1">
        <select
          aria-label={`Appearance reset scope for ${user.email}`}
          className="input-theme px-2 py-1 text-xs"
          value={resetScope}
          onChange={(event) => setResetScope(event.target.value as AdminAppearanceResetScope)}
        >
          <option value="Defaults">Global defaults</option>
          <option value="ProjectOverrides">Project overrides</option>
          <option value="All">All appearance</option>
        </select>
        <button className="btn-ghost rounded-lg px-2 py-1 text-xs" onClick={() => onResetAppearance(resetScope)}>
          Reset
        </button>
      </div>
      {user.id !== currentUserId && (
        <button
          className="rounded-lg px-2 py-1 text-xs"
          style={{ color: user.isBlocked ? 'var(--color-success)' : 'var(--color-danger-strong)' }}
          onClick={() => void onToggleBlocked()}
        >
          {user.isBlocked ? 'Unblock' : 'Block'}
        </button>
      )}
    </div>
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
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Editor' | 'Commenter' | 'Viewer'>('Viewer');
  const [nextOwnerEmail, setNextOwnerEmail] = useState('');
  const [busy, setBusy] = useState(false);
  if (project.deletedAt || project.userDeletedAt)
    return (
      <article
        className="rounded-2xl border p-4"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="opacity-60" aria-disabled="true">
          <h2 className="font-semibold">{project.name}</h2>
          <p className="text-sm">
            Owner: {project.ownerEmail} · {project.userDeletedAt ? 'User-deleted' : 'Trashed'}
          </p>
          <p className="mt-2 text-xs">
            {project.members.map((member) => `${member.email} (${member.role})`).join(' · ') || 'No members'}
          </p>
          <p className="mt-2 text-xs">Restore this project to change ownership or membership.</p>
          {project.userDeletedAt && (
            <p className="mt-2 text-xs">
              Scheduled for permanent deletion:{' '}
              {new Date(new Date(project.userDeletedAt).getTime() + 30 * 86400000).toLocaleDateString()}
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
            Restore project
          </button>
          <button
            className="btn-ghost rounded-lg px-3 py-2 text-sm"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm(`Permanently delete “${project.name}” and all its boards? This cannot be undone.`))
                return;
              setBusy(true);
              try {
                await onPurge();
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete permanently
          </button>
        </div>
      </article>
    );
  return (
    <article
      className="rounded-2xl border p-4"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h2 className="font-semibold">{project.name}</h2>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Owner: {project.ownerEmail}
            {project.deletedAt ? ' · trashed' : ''}
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
            className="input-theme min-w-0 flex-1 px-2 py-1 text-xs sm:flex-none"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as typeof role)}
            className="input-theme px-2 py-1 text-xs"
          >
            <option>Viewer</option>
            <option>Commenter</option>
            <option>Editor</option>
          </select>
          <button className="btn-accent rounded-lg px-2 py-1 text-xs">Add</button>
        </form>
      </div>
      <form
        className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border p-3"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        onSubmit={(event) => {
          event.preventDefault();
          if (!nextOwnerEmail || !window.confirm(`Transfer “${project.name}” to ${nextOwnerEmail}?`)) return;
          onTransferOwner(nextOwnerEmail);
          setNextOwnerEmail('');
        }}
      >
        <label className="text-xs font-semibold" htmlFor={`owner-${project.id}`}>
          Change owner
        </label>
        <select
          id={`owner-${project.id}`}
          required
          className="input-theme min-w-0 max-w-full flex-1 basis-56 px-2 py-1 text-xs"
          value={nextOwnerEmail}
          onChange={(event) => setNextOwnerEmail(event.target.value)}
        >
          <option value="">Select a user</option>
          {users
            .filter((user) => !user.isBlocked && user.id !== project.ownerId)
            .map((user) => (
              <option key={user.id} value={user.email}>
                {user.displayName} · {user.email}
              </option>
            ))}
        </select>
        <button className="btn-accent rounded-lg px-3 py-1 text-xs font-semibold">Transfer ownership</button>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          The current owner remains an Editor.
        </span>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {project.members.map((member) => (
          <span
            key={member.userId}
            className="inline-flex items-center gap-2 rounded-lg border px-2 py-1 text-xs"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            {member.email} · {member.role}
            <button onClick={() => onRemove(member.userId)} aria-label={`Remove ${member.email}`}>
              ×
            </button>
          </span>
        ))}
      </div>
    </article>
  );
}
