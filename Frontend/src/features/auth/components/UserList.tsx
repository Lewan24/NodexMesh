import UserAvatar from '@/shared/components/UserAvatar';
import { displayLabel, translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function UserList() {
  useTranslation();
  const { users, currentUser, removeUser } = useAuth();

  return (
    <div className="max-h-64 overflow-y-auto py-1.5">
      {users.map((user) => (
        <div key={user.id} className="flex items-center gap-3 px-5 py-2.5">
          <UserAvatar avatarId={user.avatarId} name={user.name} size={28} />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
              {user.name}
            </p>

            <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
              @{user.username} · {displayLabel(user.role)}
            </p>
          </div>

          {user.id !== currentUser?.id && (
            <button
              onClick={() => removeUser(user.id)}
              className="text-xs px-2 py-1 rounded-lg flex-shrink-0 transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(event) => {
                event.currentTarget.style.color = 'var(--color-danger-strong)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.color = 'var(--color-text-muted)';
              }}
            >
              {translate('Remove')}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
