interface DragHandleProps {
  onMouseDown: (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;

  title?: string;
  color?: string;
  compact?: boolean;
}

export default function DragHandle({
  onMouseDown,
  title = 'Drag',
  color = 'currentColor',
  compact = false,
}: DragHandleProps) {
  return (
    <button
      type="button"
      onMouseDown={event => {
        event.stopPropagation();
        onMouseDown(event);
      }}
      className="
        flex
        flex-shrink-0
        items-center
        justify-center

        rounded-xs

        cursor-grab
        active:cursor-grabbing

        transition-all
        duration-150

        hover:ring-1
        hover:ring-[var(--color-accent)]
        hover:bg-black/5

        focus-visible:outline-none
        focus-visible:ring-1
        focus-visible:ring-[var(--color-accent)]
      "
      style={{
        width: compact ? 20 : 24,
        height: compact ? 22 : 26,
        padding: compact ? 3 : 4,
        color,
        opacity: 0.72,
      }}
      title={title}
    >
      <svg
        width={compact ? 11 : 13}
        height={compact ? 14 : 16}
        viewBox="0 0 12 18"
        fill="currentColor"
      >
        <circle cx="3" cy="3" r="1.25" />
        <circle cx="9" cy="3" r="1.25" />

        <circle cx="3" cy="9" r="1.25" />
        <circle cx="9" cy="9" r="1.25" />

        <circle cx="3" cy="15" r="1.25" />
        <circle cx="9" cy="15" r="1.25" />
      </svg>
    </button>
  );
}