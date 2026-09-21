import { useState } from 'react';
import type { BoardItem, TextSection, TextSectionStyle } from '@/entities/board/types';
import { ITEM_TEXT_SECTIONS, SECTION_LABELS, updateTextSections } from '../../typography/sectionTypography';
import { MIN_FONT_SIZE, MAX_FONT_SIZE } from '../../typography/typographyUtils';

export default function SectionTypographyControls({
  item,
  onUpdate,
}: {
  item: BoardItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}) {
  const available = ITEM_TEXT_SECTIONS[item.type];
  const [selection, setSelection] = useState<TextSection[]>(available.slice(0, 1));
  const sections = selection.filter((section) => available.includes(section));
  const targets = sections.length ? sections : available.slice(0, 1);
  const styles = targets.map((section) => item.typography?.sections?.[section]);
  const common = <K extends keyof TextSectionStyle>(key: K): TextSectionStyle[K] | undefined =>
    styles.every((style) => style?.[key] === styles[0]?.[key]) ? styles[0]?.[key] : undefined;
  const update = (patch?: Partial<TextSectionStyle>) =>
    onUpdate((current) => updateTextSections(current, targets, patch));
  if (!available.length) return null;
  return (
    <div
      className="edit-bar-row edit-bar-section-controls flex items-center gap-2 px-3 py-2 border-t overflow-x-auto text-xs"
      style={{ borderColor: 'var(--color-border-soft)', color: 'var(--color-text-primary)' }}
    >
      <span className="shrink-0 font-medium" title="Hold Ctrl or Command to select multiple sections">
        Text sections
      </span>
      <select
        multiple
        aria-label="Text sections to style (select one or more)"
        size={Math.min(available.length, 3)}
        value={targets}
        onChange={(event) =>
          setSelection(Array.from(event.target.selectedOptions, (option) => option.value as TextSection))
        }
        className="shrink-0 rounded border px-2 py-1"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {available.map((section) => (
          <option key={section} value={section}>
            {SECTION_LABELS[section]}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 shrink-0">
        Size
        <input
          aria-label="Section font size"
          type="number"
          min={MIN_FONT_SIZE}
          max={MAX_FONT_SIZE}
          placeholder="Auto / mixed"
          key={`${targets.join(',')}-${common('fontSize')}`}
          defaultValue={common('fontSize') ?? ''}
          className="w-24 rounded border p-1 bg-transparent"
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          onBlur={(event) => {
            const value = event.target.value;
            if (!value) update({ fontSize: undefined });
            else if (Number.isFinite(Number(value))) {
              const fontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Number(value)));
              event.currentTarget.value = String(fontSize);
              update({ fontSize });
            }
          }}
        />
      </label>
      <label className="flex items-center gap-1 shrink-0">
        Color
        <input
          aria-label="Section text color"
          type="color"
          value={common('color') ?? '#172033'}
          onChange={(event) => update({ color: event.target.value })}
          className="w-8 h-8 cursor-pointer"
        />
      </label>
      <button type="button" className="shrink-0 underline" onClick={() => update({ color: undefined })}>
        Auto color
      </button>
      <button
        type="button"
        aria-pressed={common('bold') === true}
        aria-label="Bold section text"
        className="shrink-0 rounded border px-2 py-1 font-bold"
        onClick={() => update({ bold: !common('bold') })}
      >
        B
      </button>
      <button
        type="button"
        aria-pressed={common('italic') === true}
        aria-label="Italic section text"
        className="shrink-0 rounded border px-2 py-1 italic"
        onClick={() => update({ italic: !common('italic') })}
      >
        I
      </button>
      <select
        aria-label="Section text alignment"
        value={common('textAlign') ?? ''}
        onChange={(event) => update({ textAlign: (event.target.value || undefined) as TextSectionStyle['textAlign'] })}
        className="rounded border p-1"
        style={{ background: 'var(--color-surface)' }}
      >
        <option value="">Auto / mixed alignment</option>
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
      {(item.type === 'note' || item.type === 'text') && (
        <select
          aria-label="Vertical text alignment"
          value={item.typography?.verticalAlign ?? (item.type === 'note' && item.dispenserId ? 'middle' : 'top')}
          onChange={(event) => {
            const verticalAlign = event.target.value as 'top' | 'middle' | 'bottom';
            onUpdate((current) => ({ ...current, typography: { ...current.typography, verticalAlign } }));
          }}
          className="rounded border p-1"
          style={{ background: 'var(--color-surface)' }}
        >
          <option value="top">Top</option>
          <option value="middle">Middle</option>
          <option value="bottom">Bottom</option>
        </select>
      )}
      <span className="shrink-0" aria-live="polite">
        {common('color') ?? 'Auto / mixed color'}
      </span>
      <button type="button" className="shrink-0 underline" onClick={() => update()}>
        Reset sections
      </button>
    </div>
  );
}
