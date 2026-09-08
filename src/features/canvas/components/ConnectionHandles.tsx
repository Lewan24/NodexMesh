export type ConnectionSide =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left';

interface ConnectionHandlesProps {
  visible: boolean;

  onStart: (
    event: React.MouseEvent,
    side: ConnectionSide,
  ) => void;
}

export default function ConnectionHandles({
  visible,
  onStart,
}: ConnectionHandlesProps) {
  if (!visible) return null;

  return (
    <>
      <ConnectionHandle
        side="top"
        style={{
          left: '50%',
          top: -20,
          transform:
            'translateX(-50%)',
        }}
        onStart={onStart}
      />

      <ConnectionHandle
        side="right"
        style={{
          right: -20,
          top: '50%',
          transform:
            'translateY(-50%)',
        }}
        onStart={onStart}
      />

      <ConnectionHandle
        side="bottom"
        style={{
          left: '50%',
          bottom: -20,
          transform:
            'translateX(-50%)',
        }}
        onStart={onStart}
      />

      <ConnectionHandle
        side="left"
        style={{
          left: -20,
          top: '50%',
          transform:
            'translateY(-50%)',
        }}
        onStart={onStart}
      />
    </>
  );
}

interface ConnectionHandleProps {
  side: ConnectionSide;

  style: React.CSSProperties;

  onStart: (
    event: React.MouseEvent,
    side: ConnectionSide,
  ) => void;
}

function ConnectionHandle({
  side,
  style,
  onStart,
}: ConnectionHandleProps) {
  const rotation = {
    top: -90,
    right: 0,
    bottom: 90,
    left: 180,
  }[side];

  return (
    <button
      type="button"
      className="absolute z-[70] w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-115"
      style={{
        ...style,

        color:
          'var(--color-accent)',

        backgroundColor:
          'var(--color-surface)',

        border:
          '1.5px solid var(--color-accent)',

        boxShadow:
          '0 2px 8px rgba(0,0,0,0.15)',

        cursor: 'crosshair',
      }}
      onMouseDown={event =>
        onStart(event, side)
      }
      title="Drag to connect"
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        style={{
          transform:
            `rotate(${rotation}deg)`,
        }}
      >
        <path
          d="M5 12h14M13 6l6 6-6 6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}