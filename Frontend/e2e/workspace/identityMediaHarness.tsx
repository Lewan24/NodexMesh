import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { BrandingProvider, useBranding } from '@/features/branding/BrandingProvider';
import Brand from '@/features/branding/Brand';
import UserAvatar from '@/shared/components/UserAvatar';
import PhotoEditor from '@/features/identity-media/PhotoEditor';
import { createHttpClient } from '@/shared/api/httpClient';
import type { Branding } from '@/features/identity-media/api';

const client = createHttpClient(async () => 'isolated-fixture-token');

function IdentityMediaHarness() {
  const branding = useBranding();
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [editing, setEditing] = useState<'avatar' | 'logo' | null>(null);
  const [name, setName] = useState('Example company');
  return (
    <main
      className="min-h-dvh p-6 space-y-6"
      style={{ background: 'var(--color-app-bg)', color: 'var(--color-text-primary)' }}
    >
      <header className="p-4 rounded-2xl" style={{ background: 'var(--color-chrome-bg)' }}>
        <Brand chrome />
      </header>
      <section className="p-5 rounded-2xl space-y-4" style={{ background: 'var(--color-surface)' }}>
        <h1>Identity media fixture</h1>
        <UserAvatar name="Ada User" avatarId={avatarId} size={64} />
        <button type="button" className="btn-accent px-4 py-2 rounded-lg" onClick={() => setEditing('avatar')}>
          Change profile photo
        </button>
      </section>
      <section className="p-5 rounded-2xl space-y-4" style={{ background: 'var(--color-surface)' }}>
        <form
          className="flex gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void client
              .request('/admin/settings/branding', { method: 'PUT', body: { applicationName: name } })
              .then((value) => branding.update(value as Branding));
          }}
        >
          <label>
            Application name
            <input className="input-theme ml-3 p-2" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <button type="submit" className="btn-accent px-4 py-2 rounded-lg">
            Save name
          </button>
        </form>
        <button type="button" className="btn-accent px-4 py-2 rounded-lg" onClick={() => setEditing('logo')}>
          Change application logo
        </button>
      </section>
      {editing && (
        <PhotoEditor
          imageId={editing === 'avatar' ? avatarId : branding.logoId}
          title={editing === 'avatar' ? 'Profile photo' : 'Application logo'}
          logo={editing === 'logo'}
          onClose={() => setEditing(null)}
          onSave={async (file) => {
            const path = editing === 'avatar' ? '/auth/profile/avatar' : '/admin/settings/branding/logo';
            const result = await client.request(`${path}${file ? `?name=${encodeURIComponent(file.name)}` : ''}`, {
              method: file ? 'PUT' : 'DELETE',
              ...(file ? { rawBody: file } : {}),
            });
            if (editing === 'avatar') setAvatarId((result as { avatarId: string | null }).avatarId);
            else branding.update(result as Branding);
          }}
        />
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <BrandingProvider>
    <ThemeProvider>
      <IdentityMediaHarness />
    </ThemeProvider>
  </BrandingProvider>,
);
