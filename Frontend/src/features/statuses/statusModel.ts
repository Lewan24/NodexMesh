import { translate } from '@/shared/i18n';
import type { ProjectStatus } from './types';
import { parseCustomCssRules } from '@/features/blocks/custom-css/customCss';

export function validateStatusCss(source: string): void {
  if (/[<\\]|(?:url|image-set|expression)\s*\(|@(?:import|font-face|namespace)|-moz-binding|behavior\s*:/i.test(source))
    throw new Error(translate('Status CSS cannot load external resources or contain markup or escapes.'));
  parseCustomCssRules(source);
}

export function validateStatuses(value: unknown): asserts value is ProjectStatus[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error(translate('Invalid project statuses.'));
  const ids = new Set<string>();
  const titles = new Set<string>();
  for (const status of value) {
    if (
      !status ||
      typeof status.id !== 'string' ||
      !/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(status.id) ||
      typeof status.title !== 'string' ||
      !status.title.trim() ||
      status.title.length > 100 ||
      (status.description !== undefined &&
        status.description !== null &&
        (typeof status.description !== 'string' || status.description.length > 2000))
    )
      throw new Error(translate('Invalid project status.'));
    const title = status.title.trim().normalize().toLocaleLowerCase();
    if (ids.has(status.id) || titles.has(title)) throw new Error(translate('Status titles must be unique.'));
    ids.add(status.id);
    titles.add(title);
    if (status.customCss != null) {
      if (typeof status.customCss.enabled !== 'boolean' || typeof status.customCss.source !== 'string')
        throw new Error(translate('Invalid status CSS.'));
      validateStatusCss(status.customCss.source);
    }
  }
}
