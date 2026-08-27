interface LineEndpointHandleProps {
  x: number;
  y: number;

  attached: boolean;

  color: string;

  onMouseDown: (
    event:
      React.MouseEvent,
  ) => void;
}

export default function LineEndpointHandle({
  x,
  y,

  attached,

  color,

  onMouseDown,
}: LineEndpointHandleProps) {
  const handleMouseDown = (
    event:
      React.MouseEvent,
  ) => {
    if (
      event.button !== 0
    ) {
      return;
    }

    event.stopPropagation();

    onMouseDown(
      event,
    );
  };

  if (attached) {
    return (
      <rect
        x={x - 4.5}
        y={y - 4.5}
        width={9}
        height={9}
        rx={2}
        fill={color}
        stroke="#08171d"
        strokeWidth={2}
        style={{
          cursor:
            'crosshair',

          pointerEvents:
            'all',
        }}
        onMouseDown={
          handleMouseDown
        }
      />
    );
  }

  return (
    <circle
      cx={x}
      cy={y}
      r={5}
      fill={color}
      stroke="#08171d"
      strokeWidth={2}
      style={{
        cursor:
          'crosshair',

        pointerEvents:
          'all',
      }}
      onMouseDown={
        handleMouseDown
      }
    />
  );
}