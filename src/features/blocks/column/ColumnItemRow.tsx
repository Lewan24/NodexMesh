import type { ReactNode } from 'react';

interface ColumnItemRowProps {
  isDragging: boolean;
  isSelected: boolean;
  onDragHandleMouseDown: (event: React.MouseEvent) => void;
  onEject: () => void;
  onSelect: () => void;
  children: ReactNode;
}

export default function ColumnItemRow({
  isDragging,
  isSelected,
  onDragHandleMouseDown,
  onEject,
  onSelect,
  children,
}: ColumnItemRowProps) {
  return (
    <div
      data-column-item="true"
      className="group/row relative"
      style={{
        opacity: isDragging ? 0.3 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      <div
        className="relative rounded-xl overflow-hidden shadow-sm border cursor-pointer"
        style={{
          borderColor: isSelected ? '#7C3AED' : 'rgba(0,0,0,0.07)',
          boxShadow: isSelected
            ? '0 0 0 2px rgba(124, 58, 237,0.2), 0 4px 16px rgba(0,0,0,0.08)'
            : '',
          transition: 'box-shadow 0.15s, border-color 0.15s',
        }}
        onMouseEnter={event => {
          if (!isSelected) {
            event.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)';
          }
        }}
        onMouseLeave={event => {
          if (!isSelected) {
            event.currentTarget.style.boxShadow = '';
          }
        }}
        onClick={onSelect}
      >
        <div className="absolute top-1.5 left-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity z-10">
          <div
            className="flex flex-col items-center justify-center gap-[3px] cursor-grab active:cursor-grabbing rounded-lg shadow-sm"
            style={{
              width: 24,
              height: 24,
              backgroundColor: 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(0,0,0,0.1)',
            }}
            onMouseDown={onDragHandleMouseDown}
            title="Drag to reorder or move to canvas"
          >
            {[0, 1, 2].map(index => (
              <div key={index} className="flex gap-1">
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: '#6b7280' }} />
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: '#6b7280' }} />
              </div>
            ))}
          </div>
        </div>

        <div
          className="absolute top-1.5 right-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity z-10"
          onMouseDown={event => event.stopPropagation()}
        >
          <button
            onClick={event => {
              event.stopPropagation();
              onEject();
            }}
            className="flex items-center justify-center rounded-md transition-colors"
            style={{
              width: 24,
              height: 24,
              backgroundColor: 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(0,0,0,0.1)',
            }}
            title="Pop out to canvas"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6b7280"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3h6v6M9 21H3v-6M21 3l-9 9M3 21l9-9" />
            </svg>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}