import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { getSectionStyle } from '@/features/blocks/typography/sectionTypography';
import { getTypographyStyle } from '../typography/typographyUtils';
import { isDefaultCardColor, useCardAppearance } from '../shared/cardAppearance';
import './code.css';
import { useMemo, useState } from 'react';
import hljs from 'highlight.js/lib/common';
import 'highlight.js/styles/github-dark.css';
import type { CodeItem } from '@/entities/board/types';
import type { BlockUpdateHandler } from '../types';
import ContentBlockShell from '../shared/ContentBlockShell';

async function copyCode(content: string) {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  }
}

export default function CodeBlock({
  item,
  onUpdate,
  onDelete,
  readOnly = false,
}: {
  item: CodeItem;
  onUpdate: BlockUpdateHandler;
  onDelete: () => void;
  readOnly?: boolean;
}) {
  useTranslation();
  const { background, textColor, light } = useCardAppearance('#0d1117');
  const codeStyle = {
    ...getTypographyStyle(item),
    fontFamily: item.typography?.fontFamily
      ? getTypographyStyle(item).fontFamily
      : 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  };
  const [editing, setEditing] = useState(false);
  const [copyStatus, setCopyStatus] = useState('Copy');
  const autoHeight = item.autoHeight ?? !item.height;
  const language = hljs.getLanguage(item.language) ? item.language : 'plaintext';
  const highlighted = useMemo(
    () => hljs.highlight(item.content, { language, ignoreIllegals: true }).value,
    [item.content, language],
  );
  const update = (patch: Partial<CodeItem>) =>
    onUpdate((current) => (current.type === 'code' ? { ...current, ...patch } : current));
  return (
    <ContentBlockShell
      item={{ ...item, color: isDefaultCardColor(item.color) && !item.colorRole ? '#0d1117' : item.color }}
      autoHeight={autoHeight}
      minHeight={160}
      onDelete={onDelete}
      title={
        <div className="flex items-center gap-2">
          <span className="font-mono opacity-60">&lt;/&gt;</span>
          <select
            aria-label={translate('Code language')}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-xs flex-1 min-w-0 rounded-sm px-2 py-1"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              colorScheme: light ? 'light' : 'dark',
            }}
            value={language}
            disabled={item.locked}
            onChange={(e) => update({ language: e.target.value })}
          >
            {hljs
              .listLanguages()
              .sort()
              .map((name) => (
                <option
                  key={name}
                  value={name}
                  style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                >
                  {name === 'xml' ? 'HTML / XML' : name}
                </option>
              ))}
          </select>
          {!item.locked && !readOnly && (
            <button
              type="button"
              className="shrink-0 text-xs"
              aria-pressed={autoHeight}
              title={translate('Fit code and grow automatically while editing')}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => update({ autoHeight: true, height: undefined })}
            >
              {translate('Auto-fit')}
            </button>
          )}
          {!item.locked && !readOnly && (
            <button className="text-xs" onMouseDown={(e) => e.stopPropagation()} onClick={() => setEditing(!editing)}>
              {editing ? translate('Preview') : translate('Edit')}
            </button>
          )}
          <button
            type="button"
            data-read-only-action="copy-code"
            className="text-xs"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={async () => {
              if (await copyCode(item.content)) {
                setCopyStatus('Copied!');
              } else {
                setCopyStatus('Copy failed');
              }
            }}
          >
            {translate(copyStatus)}
          </button>
        </div>
      }
    >
      <div
        className={`flex-1 min-h-0 ${autoHeight ? 'overflow-x-auto' : 'overflow-auto'} code-content`}
        data-light={light}
        style={{ background, color: textColor }}
        data-wheel-scroll={!autoHeight}
        onMouseDown={(e) => {
          if (editing) e.stopPropagation();
        }}
        onDoubleClick={() => setEditing(true)}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {editing && !item.locked && !readOnly ? (
          <textarea
            style={{ ...codeStyle, ...getSectionStyle(item.typography, 'body') }}
            aria-label={translate('Code content')}
            spellCheck={false}
            wrap="off"
            rows={autoHeight ? Math.max(3, item.content.split('\n').length) : undefined}
            className={`block w-full ${autoHeight ? '' : 'h-full'} min-h-24 p-4 resize-none outline-none font-mono text-sm leading-6 bg-transparent`}
            value={item.content}
            placeholder={translate('Paste or type code…')}
            onChange={(e) => {
              update({ content: e.target.value });
              setCopyStatus('Copy');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const input = e.currentTarget;
                const start = input.selectionStart;
                const end = input.selectionEnd;
                update({ content: item.content.slice(0, start) + '  ' + item.content.slice(end) });
                requestAnimationFrame(() => input.setSelectionRange(start + 2, start + 2));
              }
            }}
          />
        ) : (
          <pre
            data-custom-text-color={item.typography?.sections?.body?.color ? true : undefined}
            style={{ ...codeStyle, ...getSectionStyle(item.typography, 'body') }}
            className="p-4 text-sm leading-6 font-mono min-h-full cursor-text select-text"
          >
            <code
              className={`hljs language-${language}`}
              style={{ padding: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 'inherit' }}
              dangerouslySetInnerHTML={{
                __html: highlighted || '<span style="opacity:.45">Double-click to write code…</span>',
              }}
            />
          </pre>
        )}
      </div>
    </ContentBlockShell>
  );
}
