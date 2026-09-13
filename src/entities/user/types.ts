export type Role = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
}
