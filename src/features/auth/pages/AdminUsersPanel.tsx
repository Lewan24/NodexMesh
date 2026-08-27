import AddUserForm from '@/features/auth/components/AddUserForm';
import UserList from '@/features/auth/components/UserList';

interface AdminUsersPanelProps {
  onClose: () => void;
}

export default function AdminUsersPanel({
  onClose,
}: AdminUsersPanelProps) {
  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-center
        justify-center
      "
      style={{
        backgroundColor:
          'rgba(8,16,20,0.55)',

        backdropFilter:
          'blur(2px)',
      }}
      onMouseDown={event => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className="
          w-full
          max-w-md
          mx-4
          rounded-3xl
          shadow-2xl
          overflow-hidden
        "
        style={{
          backgroundColor:
            'var(--color-surface)',

          border:
            '1px solid var(--color-border)',

          animation:
            'slide-up 0.15s ease forwards',
        }}
      >
        <div
          className="
            flex
            items-center
            justify-between
            px-5
            py-4
          "
          style={{
            borderBottom:
              '1px solid var(--color-border)',
          }}
        >
          <div>
            <h2
              className="text-sm font-bold"
              style={{
                color:
                  'var(--color-text-primary)',
              }}
            >
              Manage users
            </h2>

            <p
              className="text-xs mt-0.5"
              style={{
                color:
                  'var(--color-text-muted)',
              }}
            >
              Only admins can create
              accounts.
            </p>
          </div>

          <button
            onClick={onClose}
            className="
              w-7
              h-7
              flex
              items-center
              justify-center
              rounded-lg
              btn-ghost
            "
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <AddUserForm />
        <UserList />
      </div>
    </div>
  );
}