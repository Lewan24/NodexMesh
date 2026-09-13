export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  constructor(public readonly problem: ProblemDetails) {
    super(problem.title);
    this.name = 'ApiError';
  }
}

export function fail(status: number, code: string, title: string): never {
  throw new ApiError({ type: 'about:blank', status, code, title });
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'The operation failed. Your changes have not been discarded.';
}
