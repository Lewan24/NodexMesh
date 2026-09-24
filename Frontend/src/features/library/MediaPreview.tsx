import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useMediaSource } from './useMediaSource';

export default function MediaPreview({
  source,
  name,
  fit = 'contain',
}: {
  source: string;
  name: string;
  fit?: 'cover' | 'contain';
}) {
  useTranslation();
  const media = useMediaSource(source);
  if (!media.url) return <span className="text-xs opacity-60">{translate('Media unavailable or loading…')}</span>;
  return media.type.startsWith('video/') ? (
    <video
      src={media.url}
      controls
      preload="metadata"
      className="w-full h-full"
      style={{ objectFit: fit }}
      onMouseDown={(event) => event.stopPropagation()}
    />
  ) : (
    <img
      src={media.url}
      alt={name}
      loading="lazy"
      draggable={false}
      referrerPolicy="no-referrer"
      className="w-full h-full"
      style={{ objectFit: fit }}
    />
  );
}
