import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTheme } from '@/app/providers/ThemeProvider';
import type { AdminProject, AdminUser } from '@/features/auth/types';

export default function AdminUsersPanel({ onClose }: { onClose?: () => void }) {
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
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
        {tab === 'users' ? (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface)' }}>
              <h2 className="mb-3 font-semibold">Users</h2>
              <div className="space-y-2">
                {users.map((user) => (
                  <AdminUserRow
                    key={user.id}
                    user={user}
                    currentUserId={auth.currentUser?.id}
                    onSave={(input) => run(() => auth.updateAdminUser(user.id, input), 'User updated.')}
                    onResetPassword={() => resetPassword(user)}
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
          <section className="space-y-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onAdd={(email, role) => void run(() => auth.addProjectMember(project.id, email, role), 'Member added.')}
                onRemove={(userId) => void run(() => auth.removeProjectMember(project.id, userId), 'Member removed.')}
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
  onToggleBlocked,
}: {
  user: AdminUser;
  currentUserId?: string;
  onSave: (input: { email: string; displayName: string; isAdmin: boolean }) => Promise<boolean>;
  onResetPassword: () => void;
  onToggleBlocked: () => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ email: user.email, displayName: user.displayName, isAdmin: user.isAdmin });

  if (editing) {
    return (
      <form
        className="grid gap-2 rounded-xl p-3 sm:grid-cols-[1fr_1fr_auto]"
        style={{ backgroundColor: 'var(--color-surface-alt)' }}
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
      style={{ backgroundColor: 'var(--color-surface-alt)' }}
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
  onAdd,
  onRemove,
}: {
  project: AdminProject;
  onAdd: (email: string, role: 'Editor' | 'Commenter' | 'Viewer') => void;
  onRemove: (id: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Editor' | 'Commenter' | 'Viewer'>('Viewer');
  return (
    <article className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <h2 className="font-semibold">{project.name}</h2>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Owner: {project.ownerEmail}
            {project.deletedAt ? ' · trashed' : ''}
          </p>
        </div>
        <form
          className="flex gap-2"
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
            className="input-theme px-2 py-1 text-xs"
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
      <div className="mt-3 flex flex-wrap gap-2">
        {project.members.map((member) => (
          <span
            key={member.userId}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs"
            style={{ backgroundColor: 'var(--color-surface-alt)' }}
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
