import type { BoardItem, TextItem } from '@/entities/board/types';
import EditBarButton, { EditBarDivider } from './EditBarButton';

type TextAlign = NonNullable<TextItem['textAlign']>;

const SIZES: TextItem['size'][] = ['sm', 'md', 'lg', 'xl'];
const ALIGNMENTS: TextAlign[] = ['left', 'center', 'right'];

interface TextControlsProps {
  item: TextItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}

export default function TextControls({ item, onUpdate }: TextControlsProps) {
  const update = (patch: Partial<TextItem>) => {
    onUpdate(current =>
      current.type === 'text'
        ? { ...current, ...patch }
        : current,
    );
  };

  return (
    <>
      <EditBarDivider />

      {ALIGNMENTS.map(alignment => (
        <EditBarButton
          key={alignment}
          active={(item.textAlign ?? 'left') === alignment}
          onClick={() => update({ textAlign: alignment })}
          title={`Align ${alignment}`}
        >
          {alignment === 'left' && (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 6h18M3 12h12M3 18h15" strokeLinecap="round" />
            </svg>
          )}

          {alignment === 'center' && (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 6h18M6 12h12M4 18h16" strokeLinecap="round" />
            </svg>
          )}

          {alignment === 'right' && (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 6h18M9 12h12M6 18h15" strokeLinecap="round" />
            </svg>
          )}
        </EditBarButton>
      ))}

      <EditBarDivider />

      {SIZES.map(size => (
        <EditBarButton
          key={size}
          active={item.size === size}
          onClick={() => update({ size })}
          title={`Size ${size}`}
        >
          <span style={{ fontSize: size === 'sm' ? 9 : size === 'md' ? 11 : size === 'lg' ? 13 : 15 }}>
            {size.toUpperCase()}
          </span>
        </EditBarButton>
      ))}

      <EditBarDivider />

      <EditBarButton
        active={!!item.bold}
        onClick={() => update({ bold: !item.bold })}
        title="Bold"
      >
        <span style={{ fontWeight: 800, fontSize: 13 }}>B</span>
      </EditBarButton>

      <EditBarButton
        active={!!item.italic}
        onClick={() => update({ italic: !item.italic })}
        title="Italic"
      >
        <span style={{ fontStyle: 'italic', fontFamily: 'Georgia, serif', fontSize: 13 }}>I</span>
      </EditBarButton>
    </>
  );
}