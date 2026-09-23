import i18n, { translate } from '@/shared/i18n';
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  constructor(
    public readonly problem: ProblemDetails,
    alreadyLocalized = false,
  ) {
    super(alreadyLocalized ? problem.title : localizedProblem(problem));
    this.name = 'ApiError';
  }
}

export function fail(status: number, code: string, title: string): never {
  throw new ApiError({ type: 'about:blank', status, code, title }, true);
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : translate('The operation failed. Your changes have not been discarded.');
}

function localizedProblem(problem: ProblemDetails): string {
  if (i18n.exists(problem.title)) return translate(problem.title);
  // Mock services may already supply a localized message.
  if (i18n.language === 'en' || Object.values(i18n.getResourceBundle('pl', 'translation')).includes(problem.title))
    return problem.title;
  const fallback: Record<number, string> = {
    400: 'Check the entered values and try again.',
    401: 'Please sign in again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested item could not be found.',
    409: 'The data changed in another session. Local changes are preserved.',
    422: 'Check the entered values and try again.',
    429: 'Too many requests. Please wait before retrying.',
  };
  return translate(fallback[problem.status] ?? 'An unexpected error occurred.');
}
