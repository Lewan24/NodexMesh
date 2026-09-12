import { paletteKeys, paletteBackground } from './appearanceModel';
import type { Palette, PaletteKey } from './appearanceModel';

export default function PaletteEditor({ palette, mode, onChange }: { palette: Palette; mode: string; onChange: (palette: Palette) => void }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{(['primary', 'secondary', 'canvas', ...paletteKeys] as const).map(key => {
    const fillKey = key as PaletteKey | 'canvas';
    const canGradient = key !== 'primary' && key !== 'secondary';
    const gradient = canGradient ? palette.gradients?.[fillKey] : undefined;
    const label = key === 'default' ? 'Card default' : key;
    return <div key={key} className="space-y-2 p-3 border border-current/15">
      <label className="flex items-center justify-between gap-2 text-sm">{label}<input aria-label={mode + ' ' + key} type="color" value={gradient ? (paletteKeys.includes(gradient.from as PaletteKey) ? palette[gradient.from as PaletteKey] : gradient.from) : palette[key]} onChange={event => onChange({ ...palette, [key]: event.target.value, ...(gradient ? { gradients: { ...palette.gradients, [key]: { ...gradient, from: event.target.value } } } : {}) })} /></label>
      {canGradient && <>
        <select aria-label={`${mode} ${key} fill`} className="planning-input w-full" value={gradient?.kind ?? 'solid'} onChange={event => {
          const gradients = { ...palette.gradients };
          if (event.target.value === 'solid') delete gradients[fillKey];
          else gradients[fillKey] = { from: palette[key], to: palette.accent1, angle: 135, ...gradient, kind: event.target.value as 'linear' | 'radial' };
          onChange({ ...palette, gradients });
        }}><option value="solid">Solid</option><option value="linear">Linear gradient</option><option value="radial">Radial gradient</option></select>
        {gradient && <>
          <label className="flex items-center justify-between text-sm">Second color<input aria-label={`${mode} ${key} second color`} type="color" value={paletteKeys.includes(gradient.to as PaletteKey) ? palette[gradient.to as PaletteKey] : gradient.to} onChange={event => onChange({ ...palette, gradients: { ...palette.gradients, [key]: { ...gradient, to: event.target.value } } })} /></label>
          {gradient.kind === 'linear' && <label className="flex gap-2 items-center text-sm">Angle<input aria-label={`${mode} ${key} angle`} className="min-w-0 w-full" type="range" min="0" max="360" step="15" value={gradient.angle} onChange={event => onChange({ ...palette, gradients: { ...palette.gradients, [key]: { ...gradient, angle: Number(event.target.value) } } })} />{gradient.angle}°</label>}
        </>}
        <div aria-label={`${mode} ${key} preview`} className="h-8 border border-current/15" style={{ background: paletteBackground(palette, fillKey) }} />
      </>}
    </div>;
  })}</div>;
}
