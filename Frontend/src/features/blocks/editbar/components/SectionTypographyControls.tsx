import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  MoveVertical,
  RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { BoardItem, TextSection, TextSectionStyle } from '@/entities/board/types';
import { translate } from '@/shared/i18n';

import { ITEM_TEXT_SECTIONS, SECTION_LABELS, updateTextSections } from '../../typography/sectionTypography';
import { MAX_FONT_SIZE, MIN_FONT_SIZE } from '../../typography/typographyUtils';

function ControlButton({
  active,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={title}
      title={title}
      onClick={onClick}
      className="flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors"
      style={{
        color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        background: active ? 'var(--color-accent-soft)' : 'var(--edit-bar-control)',
      }}
    >
      {children}
    </button>
  );
}

export default function SectionTypographyControls({
  item,
  onUpdate,
}: {
  item: BoardItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}) {
  useTranslation();
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

  const toggleSection = (section: TextSection) => {
    setSelection((current) => {
      if (!current.includes(section)) return [...current, section];
      return current.length > 1 ? current.filter((entry) => entry !== section) : current;
    });
  };

  return (
    <div
      className="edit-bar-section-controls flex flex-col gap-2 p-2 text-xs"
      style={{ color: 'var(--color-text-primary)' }}
    >
      <div
        className="edit-bar-control-card flex items-center gap-2 rounded-xl border p-2"
        style={{ borderColor: 'var(--color-border-soft)', background: 'var(--edit-bar-card)' }}
      >
        <span
          className="shrink-0 text-[9px] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--color-text-faint)' }}
        >
          {translate('Text sections')}
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {available.map((section) => {
            const active = targets.includes(section);
            return (
              <button
                key={section}
                type="button"
                aria-pressed={active}
                onClick={() => toggleSection(section)}
                className="h-7 rounded-lg px-2.5 text-[11px] font-semibold transition-colors"
                style={{
                  color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  background: active ? 'var(--color-accent-soft)' : 'var(--edit-bar-control)',
                }}
              >
                {translate(SECTION_LABELS[section])}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="edit-bar-control-card flex flex-wrap items-center gap-2 rounded-xl border p-2"
        style={{ borderColor: 'var(--color-border-soft)', background: 'var(--edit-bar-card)' }}
      >
        <label
          className="flex h-8 items-center overflow-hidden rounded-lg"
          style={{ background: 'var(--edit-bar-control)' }}
        >
          <span className="px-2 text-[10px] font-semibold" style={{ color: 'var(--color-text-faint)' }}>
            {translate('Size')}
          </span>
          <input
            aria-label={translate('Section font size')}
            type="number"
            min={MIN_FONT_SIZE}
            max={MAX_FONT_SIZE}
            placeholder="—"
            key={`${targets.join(',')}-${common('fontSize')}`}
            defaultValue={common('fontSize') ?? ''}
            className="h-full w-12 bg-transparent pr-2 text-right text-xs font-semibold outline-none"
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

        <label
          className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-lg border"
          style={{ borderColor: 'var(--color-border)', background: common('color') ?? 'var(--edit-bar-control)' }}
          title={translate('Section text color')}
        >
          <input
            aria-label={translate('Section text color')}
            type="color"
            value={common('color') ?? '#7C3AED'}
            onChange={(event) => update({ color: event.target.value })}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <ControlButton
          active={!common('color')}
          title={translate('Auto color')}
          onClick={() => update({ color: undefined })}
        >
          A
        </ControlButton>
        <ControlButton
          active={common('bold') === true}
          title={translate('Bold section text')}
          onClick={() => update({ bold: !common('bold') })}
        >
          <strong>B</strong>
        </ControlButton>
        <ControlButton
          active={common('italic') === true}
          title={translate('Italic section text')}
          onClick={() => update({ italic: !common('italic') })}
        >
          <em>I</em>
        </ControlButton>

        <span className="mx-0.5 h-5 w-px" style={{ background: 'var(--color-border)' }} />
        {(
          [
            ['left', AlignLeft],
            ['center', AlignCenter],
            ['right', AlignRight],
          ] as const
        ).map(([alignment, Icon]) => (
          <ControlButton
            key={alignment}
            active={common('textAlign') === alignment}
            title={translate(alignment === 'left' ? 'Left' : alignment === 'center' ? 'Center' : 'Right')}
            onClick={() => update({ textAlign: common('textAlign') === alignment ? undefined : alignment })}
          >
            <Icon size={15} />
          </ControlButton>
        ))}

        {(item.type === 'note' || item.type === 'text') && (
          <>
            <span className="mx-0.5 h-5 w-px" style={{ background: 'var(--color-border)' }} />
            {(
              [
                ['top', ArrowUpToLine],
                ['middle', MoveVertical],
                ['bottom', ArrowDownToLine],
              ] as const
            ).map(([alignment, Icon]) => {
              const current =
                item.typography?.verticalAlign ?? (item.type === 'note' && item.dispenserId ? 'middle' : 'top');
              return (
                <ControlButton
                  key={alignment}
                  active={current === alignment}
                  title={translate(alignment === 'top' ? 'Top' : alignment === 'middle' ? 'Middle' : 'Bottom')}
                  onClick={() =>
                    onUpdate((currentItem) => ({
                      ...currentItem,
                      typography: { ...currentItem.typography, verticalAlign: alignment },
                    }))
                  }
                >
                  <Icon size={15} />
                </ControlButton>
              );
            })}
          </>
        )}

        <span className="min-w-1 flex-1" />
        <ControlButton title={translate('Reset sections')} onClick={() => update()}>
          <RotateCcw size={14} />
        </ControlButton>
      </div>
    </div>
  );
}
