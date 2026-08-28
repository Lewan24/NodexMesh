export type Role = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  /** Mock-only plaintext password. Replace with real auth later. */
  password: string;
  name: string;
  role: Role;
}