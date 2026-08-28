import { useRef } from 'react';
import type { User } from '@/entities/user/types';
import { useOutsideClick } from '../hooks/useOutsideClick';

interface AccountMenuProps {
  user: User | null;
  isAdmin: boolean;
  theme: 'light' | 'dark';
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onToggleTheme: () => void;
  onManageUsers: () => void;
  onLogout: () => void;
}

export default function AccountMenu({
  user,
  isAdmin,
  theme,
  open,
  onToggle,
  onClose,
  onToggleTheme,
  onManageUsers,
  onLogout,
}: AccountMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useOutsideClick(open, [panelRef, buttonRef], onClose);

  return (
    <div className="relative mr-3">
      <button
        ref={buttonRef}
        onClick={onToggle}
        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-colors"
        style={{ backgroundColor: open ? 'var(--color-accent-soft)' : 'transparent' }}
        onMouseEnter={e => {
          if (!open) e.currentTarget.style.backgroundColor = 'var(--color-chrome-hover)';
        }}
        onMouseLeave={e => {
          if (!open) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
          style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
        >
          {user?.name?.charAt(0).toUpperCase()}
        </div>

        <div className="hidden sm:block text-left max-w-32">
          <div
            className="text-xs font-semibold truncate"
            style={{ color: 'var(--color-chrome-text)' }}
          >
            {user?.name}
          </div>

          <div
            className="text-[10px] truncate"
            style={{ color: 'var(--color-chrome-text-faint)' }}
          >
            @{user?.username}
          </div>
        </div>

        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path
            d={open ? 'M1 5l4-4 4 4' : 'M1 1l4 4 4-4'}
            stroke="var(--color-chrome-text-dim)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+8px)] w-60 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--color-chrome-bg-alt)',
            border: '1px solid var(--color-chrome-border-soft)',
            animation: 'slide-up 0.15s ease forwards',
          }}
        >
          <div
            className="px-4 py-3.5"
            style={{ borderBottom: '1px solid var(--color-chrome-border-soft)' }}
          >
            <p
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--color-chrome-text-strong)' }}
            >
              {user?.name}
            </p>

            <p
              className="text-xs mt-0.5 truncate capitalize"
              style={{ color: 'var(--color-chrome-text-faint)' }}
            >
              @{user?.username} · {user?.role}
            </p>
          </div>

          <div className="py-1.5">
            <button
              onClick={onToggleTheme}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm"
              style={{ color: 'var(--color-chrome-text)' }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--color-chrome-panel)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {theme === 'light' ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l1.41-1.41" />
                </svg>
              )}

              {theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            </button>

            {isAdmin && (
              <button
                onClick={onManageUsers}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm"
                style={{ color: 'var(--color-chrome-text)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'var(--color-chrome-panel)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>

                Manage users
              </button>
            )}

            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm"
              style={{ color: 'var(--color-danger)' }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'rgba(255,107,138,0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>

              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}