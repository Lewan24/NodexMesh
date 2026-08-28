import type { Role } from '@/entities/user/types';

export interface LoginInput {
  username: string;
  password: string;
}

export interface AddUserInput {
  username: string;
  password: string;
  name: string;
  role: Role;
}

export type AuthResult =
  | { ok: true }
  | { ok: false; error: string };