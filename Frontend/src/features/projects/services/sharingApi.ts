import type { HttpClient } from '@/shared/api/httpClient';
import type {
  CreatedShareLink,
  MemberRole,
  ProjectMember,
  ProjectParticipant,
  ShareLink,
} from '@/entities/project/shareTypes';

export function createSharingApi(client: HttpClient) {
  const path = (id: string) => `/projects/${encodeURIComponent(id)}`;
  return {
    async members(id: string) {
      return (await client.request(`${path(id)}/members`)) as ProjectMember[];
    },
    async participants(id: string) {
      return (await client.request(`${path(id)}/participants`)) as ProjectParticipant[];
    },
    async invite(id: string, email: string, role: MemberRole) {
      return (await client.request(`${path(id)}/members`, { method: 'POST', body: { email, role } })) as ProjectMember;
    },
    async changeRole(id: string, userId: string, role: MemberRole) {
      await client.request(`${path(id)}/members/${encodeURIComponent(userId)}`, { method: 'PATCH', body: { role } });
    },
    async remove(id: string, userId: string) {
      await client.request(`${path(id)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' });
    },
    async links(id: string) {
      return (await client.request(`${path(id)}/share-links`)) as ShareLink[];
    },
    async createLink(id: string, label: string, expiresAt: string | null) {
      return (await client.request(`${path(id)}/share-links`, {
        method: 'POST',
        body: { label: label || null, expiresAt },
      })) as CreatedShareLink;
    },
    async revoke(id: string, linkId: string) {
      await client.request(`${path(id)}/share-links/${encodeURIComponent(linkId)}`, { method: 'DELETE' });
    },
  };
}
