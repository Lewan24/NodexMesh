import { useState } from 'react';
import type { Role } from './types';
import { useAuth } from './auth/AuthContext';

interface Props {
  onClose: () => void;
}

export default function AdminUsersPanel({ onClose }: Props) {
  const { users, currentUser, addUser, removeUser } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const result = addUser({ name, username, password, role });
    if (!result.ok) {
      setError(result.error);
      setNotice('');
      return;
    }
    setError('');
    setNotice(`${username} was added.`);
    setName(''); setUsername(''); setPassword(''); setRole('user');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(8,16,20,0.55)', backdropFilter: 'blur(2px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md mx-4 rounded-3xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', animation: 'slide-up 0.15s ease forwards' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Manage users</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Only admins can create accounts.</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg btn-ghost"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add user form */}
        <form onSubmit={handleAdd} className="px-5 py-4 flex flex-col gap-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="grid grid-cols-2 gap-2.5">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name"
              className="input-theme text-sm px-3 py-2 col-span-2"
            />
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              className="input-theme text-sm px-3 py-2"
            />
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Temporary password"
              className="input-theme text-sm px-3 py-2"
            />
          </div>

          <div className="flex items-center gap-2">
            {(['user', 'admin'] as Role[]).map(r => (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg capitalize transition-colors"
                style={{
                  backgroundColor: role === r ? 'var(--color-accent-soft)' : 'var(--color-surface-alt)',
                  color: role === r ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                }}
              >
                {r}
              </button>
            ))}

            <button
              type="submit"
              className="ml-auto btn-accent text-xs font-semibold rounded-lg px-4 py-2"
            >
              Add user
            </button>
          </div>

          {error && <p className="text-xs" style={{ color: 'var(--color-danger-strong)' }}>{error}</p>}
          {notice && !error && <p className="text-xs" style={{ color: 'var(--color-success)' }}>{notice}</p>}
        </form>

        {/* User list */}
        <div className="max-h-64 overflow-y-auto py-1.5">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-5 py-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
              >
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{u.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>@{u.username} · {u.role}</p>
              </div>
              {u.id !== currentUser?.id && (
                <button
                  onClick={() => removeUser(u.id)}
                  className="text-xs px-2 py-1 rounded-lg flex-shrink-0 transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-danger-strong)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
