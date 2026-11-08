import { createElement, Fragment, type ReactNode } from 'react';
import type { NoteItem } from '@/entities/board/types';

const tags = new Set([
  'p',
  'strong',
  'em',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'h1',
  'h2',
  'h3',
  'br',
  'hr',
]);
const ignored = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'SVG',
  'MATH',
  'TEMPLATE',
  'FORM',
  'INPUT',
  'BUTTON',
  'IMG',
  'VIDEO',
  'AUDIO',
]);
const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );

/** Parse in an inert template, then retain only formatting tags, never attributes or URLs. */
export function sanitizeNoteHtml(html: string): string {
  if (typeof document === 'undefined') return escapeHtml(html.replace(/<[^>]*>/g, ''));
  const template = document.createElement('template');
  template.innerHTML = html.slice(0, 200_000);
  const serialize = (node: Node, depth: number): string => {
    if (depth > 64) return '';
    if (node.nodeType === 3) return escapeHtml(node.textContent ?? '');
    if (node.nodeType !== 1) return '';
    const element = node as Element;
    if (ignored.has(element.tagName)) return '';
    const originalTag = element.tagName.toLowerCase();
    const tag = ({ b: 'strong', i: 'em', strike: 's' } as Record<string, string>)[originalTag] ?? originalTag;
    const children = [...element.childNodes].map((child) => serialize(child, depth + 1)).join('');
    if (!tags.has(tag)) return children;
    return tag === 'br' || tag === 'hr' ? `<${tag}>` : `<${tag}>${children}</${tag}>`;
  };
  return [...template.content.childNodes].map((node) => serialize(node, 0)).join('');
}

export function getNotePlainText(item: NoteItem): string {
  if (item.contentFormat !== 'tiptap-html') return item.content;
  if (typeof document === 'undefined') {
    // Search and import validation can also run without a browser DOM.
    return item.content
      .replace(/<(script|style|iframe|object|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
      .replace(/<\/(?:p|li|h[1-3]|blockquote|pre)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, name: string) => {
        if (!name.startsWith('#'))
          return (
            ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' } as Record<string, string>)[
              name.toLowerCase()
            ] ?? entity
          );
        const point = name[1]?.toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
        return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff)
          ? String.fromCodePoint(point)
          : '\ufffd';
      })
      .trimEnd();
  }
  const html = sanitizeNoteHtml(item.content).replace(/<\/(?:p|li|h[1-3]|blockquote|pre)>|<br\s*\/?>/gi, '\n');
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.textContent?.trimEnd() ?? '';
}

export function noteEditorContent(item: Pick<NoteItem, 'content' | 'contentFormat'>) {
  if (item.contentFormat === 'tiptap-html') return sanitizeNoteHtml(item.content);
  // Legacy notes are text, including literal angle brackets and HTML-looking snippets.
  return {
    type: 'doc',
    content: item.content
      .split('\n')
      .map((line) => ({ type: 'paragraph', ...(line ? { content: [{ type: 'text', text: line }] } : {}) })),
  };
}

export default function NoteContent({ item }: { item: NoteItem }) {
  if (item.contentFormat !== 'tiptap-html' || typeof document === 'undefined') return <>{getNotePlainText(item)}</>;
  const template = document.createElement('template');
  template.innerHTML = sanitizeNoteHtml(item.content);
  const render = (node: Node, key: number): ReactNode =>
    node.nodeType === 3
      ? node.textContent
      : node.nodeType === 1
        ? createElement((node as Element).tagName.toLowerCase(), { key }, ...[...node.childNodes].map(render))
        : null;
  return <Fragment>{[...template.content.childNodes].map(render)}</Fragment>;
}
