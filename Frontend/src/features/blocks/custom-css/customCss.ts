import type { BaseItem } from '@/entities/board/types';

export const MAX_CUSTOM_CSS_LENGTH = 10_000;
export interface CssDeclaration {
  property: string;
  value: string;
}

/** Parse declaration lists only. Rules, at-rules and markup cannot escape the item scope. */
export function parseCustomCss(source: string): CssDeclaration[] {
  if (source.length > MAX_CUSTOM_CSS_LENGTH) throw new Error('Custom CSS is limited to 10,000 characters.');
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
      throw new Error('Use CSS declarations such as border-radius: 24px;');
    }
    declarations.push({ property, value });
  };

  for (let index = 0; index < source.length; index++) {
    const character = source[index]!;
    // These characters are unnecessary in declarations and unsafe in a style element.
    if (/[{}<>]/.test(character)) throw new Error('Enter declarations only, without selectors, braces or markup.');
    if (character === '\\') {
      if (index + 1 >= source.length || /[{}<>\r\n]/.test(source[index + 1]!)) {
        throw new Error('Invalid CSS escape.');
      }
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
      if (end < 0) throw new Error('Close the CSS comment with */.');
      buffer += ' ';
      index = end + 1;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === '(' || character === '[') brackets.push(character);
    else if (character === ')' || character === ']') {
      if (brackets.pop() !== (character === ')' ? '(' : '['))
        throw new Error('Unbalanced CSS parentheses or brackets.');
    } else if (character === '@') throw new Error('At-rules are not supported in item CSS.');
    else if (character === ';' && !brackets.length) {
      commit();
      continue;
    }
    buffer += character;
  }
  if (quote || brackets.length) throw new Error('Close CSS quotes, parentheses and brackets.');
  commit();
  return declarations;
}

export function customCssRule(customCss: BaseItem['customCss'], scope: string): string {
  if (!customCss?.enabled || !/^[\w-]+$/.test(scope)) return '';
  try {
    const declarations = parseCustomCss(customCss.source);
    if (!declarations.length) return '';
    // Existing item renderers use inline styles. Priority lets these optional overrides win
    // on the root only; child styles and sibling items keep their own cascade.
    return `[data-item-css-scope="${scope}"] > :not(style) {${declarations.map(({ property, value }) => `${property}: ${value} !important;`).join('\n')}}`;
  } catch {
    return '';
  }
}
