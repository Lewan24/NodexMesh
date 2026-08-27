import type { User } from '@/entities/user/types';
import type {
  AddUserInput,
  AuthResult,
} from '@/features/auth/types';

export function validateNewUser(
  input: AddUserInput,
  users: User[],
): AuthResult {
  const username = input.username.trim();
  const name = input.name.trim();

  if (
    !username ||
    !input.password ||
    !name
  ) {
    return {
      ok: false,
      error: 'All fields are required.',
    };
  }

  const usernameTaken = users.some(
    user =>
      user.username.toLowerCase() ===
      username.toLowerCase(),
  );

  if (usernameTaken) {
    return {
      ok: false,
      error: 'That username is already taken.',
    };
  }

  return { ok: true };
}