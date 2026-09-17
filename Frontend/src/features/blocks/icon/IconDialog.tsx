import { useState } from 'react';
import type { IconItem } from '@/entities/board/types';
import Modal from '@/shared/components/dialogs/Modal';
import { EMOJI_PRESETS, ICON_PRESETS } from './iconPresets';
import { getIconImageSource, prepareIconSvg } from './iconUtils';
import IconVisual from './IconVisual';

type IconPatch = Pick<IconItem, 'iconMode' | 'source' | 'label' | 'color'>;
const MODES = { preset: 'Icons', emoji: 'Emoji', svg: 'Custom SVG', url: 'Image URL' } as const;

export default function IconDialog({
  item,
  onClose,
  onSave,
}: {
  item: IconItem;
  onClose: () => void;
  onSave: (patch: IconPatch) => void;
}) {
  const [mode, setMode] = useState(item.iconMode);
  const [sources, setSources] = useState({
    preset: 'star',
    emoji: '😀',
    svg: '',
    url: '',
    [item.iconMode]: item.source,
  });
  const [label, setLabel] = useState(item.label);
  const [color, setColor] = useState(item.color ?? '#7C3AED');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<IconPatch>({
    iconMode: item.iconMode,
    source: item.source,
    label: item.label,
    color: item.color,
  });
  const source = sources[mode];

  const prepare = (): IconPatch | null => {
    try {
      const value = source.trim();
      if (!value) throw new Error('Choose an icon or enter its content.');
      if (mode === 'url' && !getIconImageSource(mode, value)) throw new Error('Enter a valid HTTP or HTTPS image URL.');
      if (mode === 'emoji' && Array.from(value).length > 32)
        throw new Error('Enter one emoji or a short emoji sequence.');
      const patch = {
        iconMode: mode,
        source: mode === 'svg' ? prepareIconSvg(value) : value,
        label: label.trim(),
        color,
      };
      setError('');
      return patch;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid icon.');
      return null;
    }
  };

  const choose = (value: string) => {
    setSources((current) => ({ ...current, [mode]: value }));
    setLabel(value);
    setError('');
  };

  return (
    <Modal onClose={onClose} centered label="Choose icon">
      <form
        className="w-[min(560px,calc(100vw-32px))] p-6 space-y-4 max-h-[85vh] overflow-y-auto"
        style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          const patch = prepare();
          if (patch) onSave(patch);
        }}
      >
        <h2 className="text-lg font-semibold">Choose icon</h2>
        <div className="flex flex-wrap gap-2" aria-label="Icon source">
          {Object.entries(MODES).map(([key, title]) => (
            <button
              key={key}
              type="button"
              aria-pressed={mode === key}
              className={`px-3 py-2 rounded-lg cursor-pointer ${mode === key ? 'bg-violet-600 text-white' : 'hover:bg-violet-500/10'}`}
              onClick={() => {
                setMode(key as IconItem['iconMode']);
                setError('');
              }}
            >
              {title}
            </button>
          ))}
        </div>
        {mode === 'preset' && (
          <input
            autoFocus
            aria-label="Search icons"
            placeholder="Search icons…"
            className="w-full p-2 border rounded-lg bg-transparent"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        )}
        {(mode === 'preset' || mode === 'emoji') && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(44px,1fr))] gap-2 max-h-56 overflow-y-auto">
            {mode === 'preset'
              ? Object.entries(ICON_PRESETS)
                  .filter(([name]) => name.includes(query.trim().toLowerCase()))
                  .map(([name, Icon]) => (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      aria-label={name}
                      aria-pressed={source === name}
                      className={`h-11 flex items-center justify-center rounded-lg cursor-pointer ${source === name ? 'bg-violet-500/20 ring-2 ring-violet-500' : 'hover:bg-violet-500/10'}`}
                      onClick={() => choose(name)}
                    >
                      <Icon size={26} color={color} />
                    </button>
                  ))
              : EMOJI_PRESETS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={emoji}
                    aria-pressed={source === emoji}
                    className={`h-11 text-2xl rounded-lg cursor-pointer ${source === emoji ? 'bg-violet-500/20 ring-2 ring-violet-500' : 'hover:bg-violet-500/10'}`}
                    onClick={() => choose(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
          </div>
        )}
        {mode === 'emoji' && (
          <label className="block">
            Your emoji
            <input
              className="block w-full mt-1 p-2 border rounded-lg bg-transparent"
              value={source}
              maxLength={64}
              onChange={(event) => choose(event.target.value)}
            />
          </label>
        )}
        {mode === 'svg' && (
          <label className="block">
            Paste SVG
            <textarea
              className="block w-full mt-1 p-2 border rounded-lg bg-transparent font-mono text-xs"
              rows={6}
              maxLength={200_000}
              placeholder={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">…</svg>'}
              value={source}
              onChange={(event) => setSources((current) => ({ ...current, svg: event.target.value }))}
            />
          </label>
        )}
        {mode === 'url' && (
          <label className="block">
            Image URL
            <input
              type="url"
              className="block w-full mt-1 p-2 border rounded-lg bg-transparent"
              maxLength={4096}
              placeholder="https://example.com/icon.svg"
              value={source}
              onChange={(event) => setSources((current) => ({ ...current, url: event.target.value }))}
            />
            <span className="text-xs opacity-70">
              Use a direct image link. Transparent SVG, PNG or WebP works best.
            </span>
          </label>
        )}
        <label className="block">
          Label
          <input
            className="block w-full mt-1 p-2 border rounded-lg bg-transparent"
            maxLength={200}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>
        {mode === 'preset' && (
          <label className="flex items-center justify-between">
            Icon color
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </label>
        )}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 flex items-center justify-center border border-dashed rounded-lg">
            <IconVisual
              item={{
                ...item,
                ...(mode === 'preset' || mode === 'emoji' ? { iconMode: mode, source, label, color } : preview),
              }}
              size={56}
            />
          </div>
          {(mode === 'svg' || mode === 'url') && (
            <button
              type="button"
              className="px-3 py-2 border rounded-lg cursor-pointer"
              onClick={() => {
                const patch = prepare();
                if (patch) setPreview(patch);
              }}
            >
              Preview
            </button>
          )}
          <span className="text-xs opacity-70">Transparent canvas background</span>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="px-4 py-2 cursor-pointer" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 rounded-lg bg-violet-600 text-white cursor-pointer">
            Save icon
          </button>
        </div>
      </form>
    </Modal>
  );
}
