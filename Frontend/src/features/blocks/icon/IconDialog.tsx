import { useContext } from 'react';
import { LibraryContext } from '@/features/library/LibraryContext';
import LibraryDialog from '@/features/library/LibraryDialog';
import { parseLibrarySource } from '@/features/library/librarySource';
import { translate, displayLabel } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import type { IconItem } from '@/entities/board/types';
import Modal from '@/shared/components/dialogs/Modal';
import { EMOJI_PRESETS, ICON_PRESETS } from './iconPresets';
import { getIconImageSource, prepareIconSvg } from './iconUtils';
import IconVisual from './IconVisual';

type IconPatch = Pick<IconItem, 'iconMode' | 'source' | 'label' | 'color'>;
const MODES = { preset: 'Icons', emoji: 'Emoji', svg: 'Custom SVG', url: 'Image URL', library: 'Library' } as const;

export default function IconDialog({
  item,
  onClose,
  onSave,
}: {
  item: IconItem;
  onClose: () => void;
  onSave: (patch: IconPatch) => void;
}) {
  useTranslation();
  const projectId = useContext(LibraryContext);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [mode, setMode] = useState(item.iconMode);
  const [sources, setSources] = useState({
    preset: 'star',
    emoji: '😀',
    svg: '',
    url: '',
    library: '',
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
      if (!value) throw new Error(translate('Choose an icon or enter its content.'));
      if (mode === 'url' && !getIconImageSource(mode, value))
        throw new Error(translate('Enter a valid HTTP or HTTPS image URL.'));
      if (mode === 'library' && !parseLibrarySource(value)) throw new Error(translate('Choose a library file.'));
      if (mode === 'emoji' && Array.from(value).length > 32)
        throw new Error(translate('Enter one emoji or a short emoji sequence.'));
      const patch = {
        iconMode: mode,
        source: mode === 'svg' ? prepareIconSvg(value) : value,
        label: label.trim(),
        color,
      };
      setError('');
      return patch;
    } catch (error) {
      setError(error instanceof Error ? error.message : translate('Invalid icon.'));
      return null;
    }
  };

  const choose = (value: string) => {
    setSources((current) => ({ ...current, [mode]: value }));
    setLabel(mode === 'preset' ? displayLabel(value) : value);
    setError('');
  };

  return (
    <Modal onClose={onClose} centered label={translate('Choose icon')}>
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
        {libraryOpen && (
          <LibraryDialog
            projectId={projectId}
            iconsOnly
            onClose={() => setLibraryOpen(false)}
            onSelect={(value, name) => {
              setSources((current) => ({ ...current, library: value }));
              setLabel(name);
              setPreview({ iconMode: 'library', source: value, label: name, color });
              setLibraryOpen(false);
            }}
          />
        )}
        {mode === 'library' && (
          <button
            type="button"
            disabled={!projectId}
            onClick={() => setLibraryOpen(true)}
            className="border rounded px-3 py-2"
          >
            {translate('Choose from project library')}
          </button>
        )}
        <h2 className="text-lg font-semibold">{translate('Choose icon')}</h2>
        <div className="flex flex-wrap gap-2" aria-label={translate('Icon source')}>
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
              {translate(title)}
            </button>
          ))}
        </div>
        {mode === 'preset' && (
          <input
            autoFocus
            aria-label={translate('Search icons')}
            placeholder={translate('Search icons…')}
            className="w-full p-2 border rounded-lg bg-transparent"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        )}
        {(mode === 'preset' || mode === 'emoji') && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(44px,1fr))] gap-2 max-h-56 overflow-y-auto">
            {mode === 'preset'
              ? Object.entries(ICON_PRESETS)
                  .filter(([name]) =>
                    [name, displayLabel(name)].some((label) =>
                      label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
                    ),
                  )
                  .map(([name, Icon]) => (
                    <button
                      key={name}
                      type="button"
                      title={displayLabel(name)}
                      aria-label={displayLabel(name)}
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
            {translate('Your emoji')}
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
            {translate('Paste SVG')}
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
            {translate('Image URL')}
            <input
              type="url"
              className="block w-full mt-1 p-2 border rounded-lg bg-transparent"
              maxLength={4096}
              placeholder="https://example.com/icon.svg"
              value={source}
              onChange={(event) => setSources((current) => ({ ...current, url: event.target.value }))}
            />
            <span className="text-xs opacity-70">
              {translate('Use a direct image link. Transparent SVG, PNG or WebP works best.')}
            </span>
          </label>
        )}
        <label className="block">
          {translate('Label')}
          <input
            className="block w-full mt-1 p-2 border rounded-lg bg-transparent"
            maxLength={200}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>
        {mode === 'preset' && (
          <label className="flex items-center justify-between">
            {translate('Icon color')}
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
              {translate('Preview')}
            </button>
          )}
          <span className="text-xs opacity-70">{translate('Transparent canvas background')}</span>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="px-4 py-2 cursor-pointer" onClick={onClose}>
            {translate('Cancel')}
          </button>
          <button type="submit" className="px-4 py-2 rounded-lg bg-violet-600 text-white cursor-pointer">
            {translate('Save icon')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
