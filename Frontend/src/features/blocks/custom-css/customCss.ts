import { translate } from '@/shared/i18n';
import type { BaseItem } from '@/entities/board/types';

export const MAX_CUSTOM_CSS_LENGTH = 10_000;
export interface CssDeclaration {
  property: string;
  value: string;
}

export interface CustomCssRule {
  /** Missing for the backwards-compatible declaration-only root style. */
  selector?: string;
  keyframes?: string;
  frames?: CustomCssRule[];
  declarations: CssDeclaration[];
}

function assertSourceLength(source: string) {
  if (source.length > MAX_CUSTOM_CSS_LENGTH) throw new Error(translate('Custom CSS is limited to 10,000 characters.'));
}

/** Parse a declaration list without allowing it to break out of its generated rule. */
export function parseCustomCss(source: string): CssDeclaration[] {
  assertSourceLength(source);
  const declarations: CssDeclaration[] = [];
  let buffer = '';
  let quote = '';
  const brackets: string[] = [];
  const commit = () => {
    const declaration = buffer.trim();
    buffer = '';
    if (!declaration) return;
    const colon = declaration.indexOf(':');
    const property = declaration.slice(0, colon).trim();
    const value = declaration
      .slice(colon + 1)
      .trim()
      .replace(/\s*!important\s*$/i, '')
      .trim();
    if (colon < 1 || !/^(?:--[\w-]+|-?[a-zA-Z][\w-]*)$/.test(property) || !value) {
      throw new Error(translate('Use CSS declarations such as border-radius: 24px;'));
    }
    declarations.push({ property, value });
  };

  for (let index = 0; index < source.length; index++) {
    const character = source[index]!;
    if (/[{}<]/.test(character)) throw new Error(translate('Use declarations only inside each CSS rule.'));
    if (character === '\\') {
      if (index + 1 >= source.length || /[{}<\r\n]/.test(source[index + 1]!))
        throw new Error(translate('Invalid CSS escape.'));
      buffer += character + source[++index];
      continue;
    }
    if (quote) {
      buffer += character;
      if (character === quote) quote = '';
      continue;
    }
    if (character === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2);
      if (end < 0) throw new Error(translate('Close the CSS comment with */.'));
      buffer += ' ';
      index = end + 1;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === '(' || character === '[') brackets.push(character);
    else if (character === ')' || character === ']') {
      if (brackets.pop() !== (character === ')' ? '(' : '['))
        throw new Error(translate('Unbalanced CSS parentheses or brackets.'));
    } else if (character === '@') throw new Error(translate('At-rules are not supported in item CSS.'));
    else if (character === ';' && !brackets.length) {
      commit();
      continue;
    }
    buffer += character;
  }
  if (quote || brackets.length) throw new Error(translate('Close CSS quotes, parentheses and brackets.'));
  commit();
  return declarations;
}

function removeComments(source: string): string {
  let result = '';
  let quote = '';
  for (let index = 0; index < source.length; index++) {
    const character = source[index]!;
    if (quote) {
      result += character;
      if (character === '\\' && index + 1 < source.length) result += source[++index];
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      result += character;
      continue;
    }
    if (character === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2);
      if (end < 0) throw new Error(translate('Close the CSS comment with */.'));
      result += ' ';
      index = end + 1;
      continue;
    }
    result += character;
  }
  if (quote) throw new Error(translate('Close CSS quotes, parentheses and brackets.'));
  return result;
}

/** Parse either legacy root declarations or a flat list of normal CSS selector rules. */
export function parseCustomCssRules(source: string): CustomCssRule[] {
  assertSourceLength(source);
  if (source.includes('<')) throw new Error(translate('Markup is not supported in item CSS.'));
  const cleaned = removeComments(source).trim();
  if (!cleaned) return [];
  if (!cleaned.includes('{')) return [{ declarations: parseCustomCss(cleaned) }];

  const rules: CustomCssRule[] = [];
  let index = 0;
  while (index < cleaned.length) {
    while (/\s/.test(cleaned[index] ?? '')) index++;
    const open = cleaned.indexOf('{', index);
    if (open < 0) throw new Error(translate('Add declarations inside selector braces.'));
    const selector = cleaned.slice(index, open).trim();
    const keyframes = selector.match(/^@keyframes\s+([a-zA-Z_][\w-]*)$/)?.[1];
    if (!selector || selector.includes('}') || (selector.includes('@') && !keyframes))
      throw new Error(translate('Use selectors such as button a, without at-rules.'));
    splitSelectorList(selector);

    let quote = '';
    let bracketDepth = 0;
    let braceDepth = 0;
    let close = -1;
    for (let cursor = open + 1; cursor < cleaned.length; cursor++) {
      const character = cleaned[cursor]!;
      if (quote) {
        if (character === '\\') cursor++;
        else if (character === quote) quote = '';
        continue;
      }
      if (character === '"' || character === "'") quote = character;
      else if (character === '(' || character === '[') bracketDepth++;
      else if (character === ')' || character === ']') bracketDepth--;
      else if (character === '{') {
        if (!keyframes) throw new Error(translate('Nested CSS rules and at-rules are not supported.'));
        braceDepth++;
      } else if (character === '}' && braceDepth > 0) braceDepth--;
      else if (character === '}' && bracketDepth === 0) {
        close = cursor;
        break;
      }
      if (bracketDepth < 0) throw new Error(translate('Unbalanced CSS parentheses or brackets.'));
    }
    if (close < 0 || quote || bracketDepth) throw new Error(translate('Close every CSS rule with }.'));
    if (keyframes) {
      const frames = parseCustomCssRules(cleaned.slice(open + 1, close));
      if (
        !frames.length ||
        frames.some(
          (frame) =>
            !frame.selector ||
            frame.keyframes ||
            !splitSelectorList(frame.selector).every(
              (step) =>
                /^(from|to|(?:100|[0-9]{1,2})(?:\.\d+)?%)$/.test(step) &&
                (!step.endsWith('%') || parseFloat(step) <= 100),
            ),
        )
      ) {
        throw new Error(translate('Use from, to or percentages inside @keyframes.'));
      }
      rules.push({ keyframes, frames, declarations: [] });
      index = close + 1;
      continue;
    }
    const declarations = parseCustomCss(cleaned.slice(open + 1, close));
    if (!declarations.length) throw new Error(translate('Add at least one declaration to each CSS rule.'));
    rules.push({ selector, declarations });
    index = close + 1;
  }
  return rules;
}

function splitSelectorList(selector: string): string[] {
  const selectors: string[] = [];
  let start = 0;
  let quote = '';
  let depth = 0;
  for (let index = 0; index < selector.length; index++) {
    const character = selector[index]!;
    if (quote) {
      if (character === '\\') index++;
      else if (character === quote) quote = '';
    } else if (character === '"' || character === "'") quote = character;
    else if (character === '(' || character === '[') depth++;
    else if (character === ')' || character === ']') depth--;
    else if (character === ',' && depth === 0) {
      selectors.push(selector.slice(start, index).trim());
      start = index + 1;
    }
    if (depth < 0) throw new Error(translate('Unbalanced CSS parentheses or brackets.'));
  }
  selectors.push(selector.slice(start).trim());
  if (quote || depth || selectors.some((entry) => !entry)) throw new Error(translate('Check the CSS selector syntax.'));
  return selectors;
}

function addNestedScopeBoundary(selector: string): string {
  const boundary =
    ':not([data-item-css-scope] [data-item-css-scope]):not([data-item-css-scope] [data-item-css-scope] *)';
  let quote = '';
  let depth = 0;
  for (let index = 0; index < selector.length - 1; index++) {
    const character = selector[index]!;
    if (quote) {
      if (character === '\\') index++;
      else if (character === quote) quote = '';
    } else if (character === '"' || character === "'") quote = character;
    else if (character === '(' || character === '[') depth++;
    else if (character === ')' || character === ']') depth--;
    else if (character === ':' && selector[index + 1] === ':' && depth === 0)
      return `${selector.slice(0, index)}${boundary}${selector.slice(index)}`;
  }
  return `${selector}${boundary}`;
}

function replaceNestingSelector(selector: string, replacement: string): { selector: string; replaced: boolean } {
  let result = '';
  let quote = '';
  let replaced = false;
  for (let index = 0; index < selector.length; index++) {
    const character = selector[index]!;
    if (quote) {
      result += character;
      if (character === '\\' && index + 1 < selector.length) result += selector[++index];
      else if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
      result += character;
    } else if (character === '\\' && index + 1 < selector.length) {
      result += character + selector[++index];
    } else if (character === '&') {
      result += replacement;
      replaced = true;
    } else result += character;
  }
  return { selector: result, replaced };
}

export function customCssSelectorForValidation(selector: string): string {
  return replaceNestingSelector(selector, '*').selector;
}

function scopeSelector(selector: string, anchor: string): string {
  return splitSelectorList(selector)
    .map((entry) => {
      const nested = replaceNestingSelector(entry, `${anchor} > :not(style)`);
      const scoped = nested.replaced ? nested.selector : `${anchor} ${entry}`;
      return addNestedScopeBoundary(scoped);
    })
    .join(', ');
}

export function customCssRule(customCss: BaseItem['customCss'], scope: string): string {
  if (!customCss?.enabled || !/^[\w-]+$/.test(scope)) return '';
  try {
    const anchor = `[data-item-css-scope="${scope}"]`;
    const rules = parseCustomCssRules(customCss.source);
    const names = new Map(
      rules.filter((rule) => rule.keyframes).map((rule) => [rule.keyframes!, `item-${scope}-${rule.keyframes}`]),
    );
    const animationValue = (value: string) =>
      value.replace(
        /"[^"\n]*"|'[^'\n]*'|(?<![\w-])[a-zA-Z_][\w-]*(?![\w(-])/g,
        (token) => names.get(token.replace(/^['"]|['"]$/g, '')) ?? token,
      );
    return rules
      .map(({ selector, declarations, keyframes, frames }) => {
        if (keyframes)
          return `@keyframes ${names.get(keyframes)} {${frames!
            .map(
              (frame) =>
                `${frame.selector} {${frame.declarations.map(({ property, value }) => `${property}: ${value};`).join('\n')}}`,
            )
            .join('\n')}}`;
        declarations = declarations.map(({ property, value }) => ({
          property,
          value:
            /^(?:-webkit-)?animation(?:-name)?$/i.test(property) || property.startsWith('--')
              ? animationValue(value)
              : value,
        }));
        const target = selector ? scopeSelector(selector, anchor) : `${anchor} > :not(style)`;
        return `${target} {${declarations.map(({ property, value }) => `${property}: ${value} !important;`).join('\n')}}`;
      })
      .join('\n');
  } catch {
    return '';
  }
}
