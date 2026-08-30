interface CanvasDropPreviewProps {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export default function CanvasDropPreview({
  x,
  y,
  width,
  height,
  label = 'Drop',
}: CanvasDropPreviewProps) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        width,
        height,
        zIndex: 999,
      }}
    >
      {/* Landing area */}

      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          border: '2px dashed var(--color-accent)',
          backgroundColor: 'rgba(124, 58, 237, 0.07)',
          boxShadow:
            'inset 0 0 0 1px rgba(124,58,237,0.08), 0 0 18px rgba(124,58,237,0.12)',
        }}
      />

      {/* Center lines */}

      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: -12,
          bottom: -12,
          width: 1,
          backgroundColor: 'rgba(124,58,237,0.32)',
        }}
      />

      <div
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          left: -12,
          right: -12,
          height: 1,
          backgroundColor: 'rgba(124,58,237,0.32)',
        }}
      />

      {/* Corners */}

      <PreviewCorner top={-3} left={-3} />
      <PreviewCorner top={-3} right={-3} />
      <PreviewCorner bottom={-3} left={-3} />
      <PreviewCorner bottom={-3} right={-3} />

      {/* Label */}

      <div
        className="absolute text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap"
        style={{
          top: -26,
          left: 0,
          color: 'var(--color-accent)',
          backgroundColor: 'var(--color-surface-translucent)',
          border: '1px solid rgba(124,58,237,0.25)',
          backdropFilter: 'blur(6px)',
        }}
      >
        {label}
      </div>
    </div>
  );
}

interface PreviewCornerProps {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

function PreviewCorner({
  top,
  right,
  bottom,
  left,
}: PreviewCornerProps) {
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
        backgroundColor: 'var(--color-accent)',
        boxShadow: '0 0 0 2px var(--color-app-bg)',
      }}
    />
  );
}