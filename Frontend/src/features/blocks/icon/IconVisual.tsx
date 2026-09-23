import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { IconItem } from '@/entities/board/types';
import { getPresetIcon } from './iconPresets';
import { getIconImageSource } from './iconUtils';

export default function IconVisual({ item, size }: { item: IconItem; size: number }) {
  useTranslation();
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (item.iconMode === 'preset') {
    const Icon = getPresetIcon(item.source);
    return <Icon size={size} color={item.color ?? '#7C3AED'} aria-label={item.label} role="img" />;
  }
  if (item.iconMode === 'emoji') {
    return (
      <span role="img" aria-label={item.label || item.source} style={{ fontSize: size * 0.85, lineHeight: 1 }}>
        {item.source}
      </span>
    );
  }
  const source = getIconImageSource(item.iconMode, item.source);
  if (!source || failedSource === source) {
    return (
      <ImageOff
        size={size}
        color="var(--color-text-muted)"
        role="img"
        aria-label={translate('Icon could not be loaded')}
      />
    );
  }
  return (
    <img
      src={source}
      alt={item.label}
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => setFailedSource(source)}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}
