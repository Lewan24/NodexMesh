import type {
  Role,
} from '@/entities/user/types';

import { useAddUserForm } from '@/features/auth/hooks/useAddUserForm';

export default function AddUserForm() {
  const {
    name,
    username,
    password,
    role,
    error,
    notice,

    setName,
    setUsername,
    setPassword,
    setRole,

    handleSubmit,
  } = useAddUserForm();

  const roles: Role[] = [
    'user',
    'admin',
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="px-5 py-4 flex flex-col gap-2.5"
      style={{
        borderBottom:
          '1px solid var(--color-border)',
      }}
    >
      <div className="grid grid-cols-2 gap-2.5">
        <input
          value={name}
          onChange={event =>
            setName(
              event.target.value,
            )
          }
          placeholder="Full name"
          className="input-theme text-sm px-3 py-2 col-span-2"
        />

        <input
          value={username}
          onChange={event =>
            setUsername(
              event.target.value,
            )
          }
          placeholder="Username"
          className="input-theme text-sm px-3 py-2"
        />

        <input
          value={password}
          onChange={event =>
            setPassword(
              event.target.value,
            )
          }
          placeholder="Temporary password"
          className="input-theme text-sm px-3 py-2"
        />
      </div>

      <div className="flex items-center gap-2">
        {roles.map(itemRole => (
          <button
            type="button"
            key={itemRole}
            onClick={() =>
              setRole(itemRole)
            }
            className="
              text-xs
              font-semibold
              px-3
              py-1.5
              rounded-lg
              capitalize
              transition-colors
            "
            style={{
              backgroundColor:
                role === itemRole
                  ? 'var(--color-accent-soft)'
                  : 'var(--color-surface-alt)',

              color:
                role === itemRole
                  ? 'var(--color-accent)'
                  : 'var(--color-text-secondary)',
            }}
          >
            {itemRole}
          </button>
        ))}

        <button
          type="submit"
          className="
            ml-auto
            btn-accent
            text-xs
            font-semibold
            rounded-lg
            px-4
            py-2
          "
        >
          Add user
        </button>
      </div>

      {error && (
        <p
          className="text-xs"
          style={{
            color:
              'var(--color-danger-strong)',
          }}
        >
          {error}
        </p>
      )}

      {notice && !error && (
        <p
          className="text-xs"
          style={{
            color:
              'var(--color-success)',
          }}
        >
          {notice}
        </p>
      )}
    </form>
  );
}