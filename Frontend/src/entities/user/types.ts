export type Role = 'admin' | 'user';

export interface User {
  avatarId?: string | null;
  id: string;
  username: string;
  name: string;
  role: Role;
}
