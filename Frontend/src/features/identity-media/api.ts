import { imageUploadName } from '@/shared/lib/publicImage';
import { httpClient } from '@/app/services';

export interface Branding {
  applicationName: string;
  logoId: string | null;
}
const client = () => {
  if (!httpClient) throw new Error('Image uploads are unavailable in the demo.');
  return httpClient;
};
export const identityMedia = {
  async avatar(file: File | null, userId?: string): Promise<{ avatarId: string | null }> {
    const path = userId ? `/admin/users/${encodeURIComponent(userId)}/avatar` : '/auth/profile/avatar';
    return (await client().request(`${path}${file ? `?name=${encodeURIComponent(imageUploadName(file))}` : ''}`, {
      method: file ? 'PUT' : 'DELETE',
      ...(file ? { rawBody: file } : {}),
    })) as { avatarId: string | null };
  },
  async readBranding(signal?: AbortSignal): Promise<Branding> {
    const result = await fetch(`${(import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')}/branding`, {
      signal,
      cache: 'no-store',
      redirect: 'error',
      credentials: 'omit',
    });
    if (!result.ok) throw new Error('Cannot load application branding.');
    const value = await result.json();
    if (
      typeof value?.applicationName !== 'string' ||
      !value.applicationName.trim() ||
      value.applicationName.length > 100 ||
      !(value.logoId === null || typeof value.logoId === 'string')
    )
      throw new Error('Invalid application branding.');
    return value;
  },
  async branding(applicationName: string): Promise<Branding> {
    return (await client().request('/admin/settings/branding', {
      method: 'PUT',
      body: { applicationName },
    })) as Branding;
  },
  async logo(file: File | null): Promise<Branding> {
    return (await client().request(
      `/admin/settings/branding/logo${file ? `?name=${encodeURIComponent(imageUploadName(file))}` : ''}`,
      { method: file ? 'PUT' : 'DELETE', ...(file ? { rawBody: file } : {}) },
    )) as Branding;
  },
};
