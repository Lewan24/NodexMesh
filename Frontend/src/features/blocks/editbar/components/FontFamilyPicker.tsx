import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import type { FontFamily } from '@/entities/board/types';
import { translate } from '@/shared/i18n';
import { FONT_FAMILIES, getFontFamilyCss } from '../../typography/typographyUtils';
import './fontFamilyPicker.css';

/** HTML options keep their font previews on platforms with unstyled native selects. */
export default function FontFamilyPicker({
  value,
  onChange,
}: {
  value?: FontFamily;
  onChange: (value: FontFamily | undefined) => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const options = [
    { value: '', label: translate('Project default'), css: 'var(--project-font, inherit)' },
    ...FONT_FAMILIES,
  ];
  const selected = Math.max(
    0,
    options.findIndex((font) => font.value === (value ?? '')),
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selected);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 280, maxHeight: 320 });
  const typed = useRef({ value: '', time: 0 });
  const choose = (index: number) => {
    onChange((options[index]!.value || undefined) as FontFamily | undefined);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };
  const show = () => {
    setActive(selected);
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(320, Math.max(280, rect.width), window.innerWidth - 16);
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const placeBelow = below >= Math.min(320, above);
      const maxHeight = Math.max(0, Math.min(320, placeBelow ? below : above));
      setPosition({
        width,
        maxHeight,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        top: placeBelow ? rect.bottom + 4 : Math.max(8, rect.top - maxHeight - 4),
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !trigger.current?.contains(event.target) &&
        !list.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [open]);
  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, id]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label={translate('Item font family')}
        aria-haspopup="listbox"
        aria-controls={open ? id : undefined}
        aria-expanded={open}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        data-font-value={value ?? ''}
        className="font-family-trigger"
        style={{ fontFamily: value ? getFontFamilyCss(value) : 'var(--project-font)' }}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(event) => {
          const key = event.key;
          if (key === 'Escape' && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          } else if (key === 'Tab') setOpen(false);
          else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
            event.preventDefault();
            event.stopPropagation();
            if (!open) show();
            else
              setActive((current) =>
                key === 'Home'
                  ? 0
                  : key === 'End'
                    ? options.length - 1
                    : (current + (key === 'ArrowDown' ? 1 : -1) + options.length) % options.length,
              );
          } else if ((key === 'Enter' || key === ' ') && open) {
            event.preventDefault();
            event.stopPropagation();
            choose(active);
          } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const now = Date.now();
            const query = (now - typed.current.time < 1000 ? typed.current.value : '') + key.toLocaleLowerCase();
            typed.current = { value: query, time: now };
            const found = options.findIndex((font) => font.label.toLocaleLowerCase().startsWith(query));
            if (found >= 0) {
              event.preventDefault();
              setActive(found);
              setOpen(true);
            }
          }
        }}
      >
        <span>{options[selected]!.label}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={list}
            id={id}
            role="listbox"
            aria-label={translate('Item font family')}
            data-canvas-ui="true"
            className="font-family-list"
            style={position}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {options.map((font, index) => (
              <div
                key={font.value}
                id={`${id}-${index}`}
                role="option"
                aria-selected={selected === index}
                className={active === index ? 'is-active' : ''}
                style={{ fontFamily: font.css }}
                onPointerMove={() => setActive(index)}
                onClick={() => choose(index)}
              >
                <span>{font.label}</span>
                {selected === index && <Check size={16} aria-hidden="true" />}
              </div>
            ))}
          </div>,
          trigger.current?.closest('dialog') ?? document.body,
        )}
    </>
  );
}
