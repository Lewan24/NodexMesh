import type { SectionTitleItem } from '@/entities/board/types';
import type { BlockUpdateHandler } from '../types';
import { useTheme } from '@/app/providers/ThemeProvider';
import SectionLabel, { sectionTitleScale } from '../shared/SectionLabel';
export { sectionTitleScale } from '../shared/SectionLabel';
export default function SectionTitleBlock({ item, zoom, onUpdate }: { item: SectionTitleItem; zoom: number; onUpdate: BlockUpdateHandler }) {
  const { appearance, theme } = useTheme();
  const color = item.colorRole ? appearance[theme][item.colorRole] : item.color ?? '#7C3AED';
  return <div style={{ width: item.width ?? 320, height: 36, position: 'relative' }}>
    <div className="absolute pointer-events-auto" style={{ left: 0, top: 36, transform: `translateY(-100%) scale(${sectionTitleScale(zoom)})`, transformOrigin: 'bottom left', zIndex: 50 }}>
      <SectionLabel item={item} title={item.content} color={color} zoom={zoom} onChange={content => onUpdate(current => current.type === 'section-title' ? { ...current, content } : current)} />
    </div>
  </div>;
}
