interface CanvasDropPreviewProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export default function CanvasDropPreview({ x, y, width, height, label = 'Drop' }: CanvasDropPreviewProps) {
  return (
    <div className="absolute pointer-events-none" style={{ left: x, top: y, width, height, zIndex: 100001 }}>
      {/* Actual landing area */}

      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          border: '2px dashed var(--color-accent)',
          backgroundColor: 'rgba(124,58,237,0.07)',
          boxShadow: 'inset 0 0 0 1px rgba(124,58,237,0.08), 0 0 18px rgba(124,58,237,0.12)',
        }}
      />

      {/* Local center X */}

      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: -14,
          bottom: -14,
          width: 1,
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(124,58,237,0.38)',
        }}
      />

      {/* Local center Y */}

      <div
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          left: -14,
          right: -14,
          height: 1,
          transform: 'translateY(-50%)',
          backgroundColor: 'rgba(124,58,237,0.38)',
        }}
      />

      {/* Exact center */}

      <div
        className="absolute rounded-full"
        style={{
          left: '50%',
          top: '50%',
          width: 8,
          height: 8,
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--color-accent)',
          boxShadow: '0 0 0 3px var(--color-app-bg), 0 0 10px rgba(124,58,237,0.45)',
        }}
      />

      {/* Center cross */}

      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          width: 20,
          height: 2,
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--color-accent)',
        }}
      />

      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          width: 2,
          height: 20,
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--color-accent)',
        }}
      />

      {/* Edge center markers */}

      <PreviewDot left="50%" top={-3} />

      <PreviewDot left="50%" bottom={-3} />

      <PreviewDot top="50%" left={-3} />

      <PreviewDot top="50%" right={-3} />

      {/* Corners */}

      <PreviewDot top={-3} left={-3} />

      <PreviewDot top={-3} right={-3} />

      <PreviewDot bottom={-3} left={-3} />

      <PreviewDot bottom={-3} right={-3} />

      {/* Label */}

      <div
        className="absolute text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap"
        style={{
          top: -28,
          left: 0,
          color: 'var(--color-accent)',
          backgroundColor: 'var(--color-surface-translucent)',
          border: '1px solid rgba(124,58,237,0.25)',
          backdropFilter: 'blur(6px)',
        }}
      >
        {label}
      </div>

      {/* Dimensions */}

      <div
        className="absolute text-[9px] font-mono px-1.5 py-0.5 rounded-md whitespace-nowrap"
        style={{
          bottom: -24,
          right: 0,
          color: 'var(--color-text-faint)',
          backgroundColor: 'var(--color-surface-translucent)',
          border: '1px solid var(--color-border-soft)',
          backdropFilter: 'blur(6px)',
        }}
      >
        {Math.round(width)} × {Math.round(height)}
      </div>
    </div>
  );
}

interface PreviewDotProps {
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
}

function PreviewDot({ top, right, bottom, left }: PreviewDotProps) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        top,
        right,
        bottom,
        left,
        width: 6,
        height: 6,
        transform: typeof left === 'string' || typeof top === 'string' ? 'translate(-50%, -50%)' : undefined,
        backgroundColor: 'var(--color-accent)',
        boxShadow: '0 0 0 2px var(--color-app-bg)',
      }}
    />
  );
}
