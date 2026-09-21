import type { CSSProperties } from 'react';
import type { BoardItem, TextSection, TextSectionStyle, TypographySettings } from '@/entities/board/types';

export const SECTION_LABELS: Record<TextSection, string> = {
  title: 'Title',
  description: 'Description',
  body: 'Body',
  links: 'Links',
  caption: 'Caption',
  labels: 'Labels',
};
export const ITEM_TEXT_SECTIONS: Record<BoardItem['type'], TextSection[]> = {
  board: ['title', 'description', 'links'],
  'section-title': ['title'],
  note: ['body'],
  text: ['body'],
  document: ['title', 'body', 'links'],
  code: ['body'],
  icon: [],
  image: ['caption'],
  link: ['title', 'description', 'links'],
  embed: ['title'],
  checklist: ['title', 'body'],
  kanban: ['title', 'labels', 'body'],
  timeline: ['title', 'body', 'labels'],
  column: ['title'],
  frame: ['title'],
  dispenser: ['title'],
  line: ['labels'],
  drawing: [],
  mindmap: ['title', 'labels'],
  diagram: ['title', 'labels'],
  database: ['title', 'labels', 'body'],
};

/** Only explicit overrides replace the renderer's semantic defaults. */
export function getSectionStyle(typography: TypographySettings | undefined, section: TextSection): CSSProperties {
  const style = typography?.sections?.[section];
  if (!style) return {};
  return {
    ...(style.color ? { color: style.color, fill: style.color } : {}),
    ...(style.fontSize ? { fontSize: style.fontSize } : {}),
    ...(style.bold !== undefined ? { fontWeight: style.bold ? 700 : 400 } : {}),
    ...(style.italic !== undefined ? { fontStyle: style.italic ? 'italic' : 'normal' } : {}),
    ...(style.textAlign ? { textAlign: style.textAlign } : {}),
  };
}

export function updateTextSections(
  item: BoardItem,
  sections: TextSection[],
  patch?: Partial<TextSectionStyle>,
): BoardItem {
  const next = { ...item.typography?.sections };
  for (const section of sections) {
    if (patch) next[section] = { ...next[section], ...patch };
    else delete next[section];
  }
  return { ...item, typography: { ...item.typography, sections: next } };
}

/** CSS variables allow rich document links to inherit an independently configured style. */
export function getDocumentLinkVariables(typography?: TypographySettings): CSSProperties {
  const style = getSectionStyle(typography, 'links');
  return {
    '--document-link-color': style.color,
    '--document-link-size': style.fontSize ? `${style.fontSize}px` : undefined,
    '--document-link-weight': style.fontWeight,
    '--document-link-style': style.fontStyle,
  } as CSSProperties;
}
