import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { loadYouTubeApi } from './youtubeApi';
import type { YouTubePlayer } from './youtubeApi';

export default function YouTubeVideo({
  videoId,
  title,
  interactive = false,
}: {
  videoId: string;
  title: string;
  interactive?: boolean;
}) {
  useTranslation();
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const gesture = useRef<{ x: number; y: number; time: number; moved: boolean } | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [requested, setRequested] = useState(false);
  const activated = requested || interactive;
  useEffect(() => {
    if (!activated) return;
    // Keep an activated player mounted when returning to drag-to-move mode.
    setRequested(true);
    let cancelled = false;
    let instance: YouTubePlayer | null = null;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setFailed(true);
    }, 15000);
    setReady(false);
    setFailed(false);
    setPlaying(false);
    loadYouTubeApi()
      .then((api) => {
        if (cancelled || !host.current) return;
        const mount = document.createElement('div');
        host.current.replaceChildren(mount);
        instance = new api.Player(mount, {
          host: 'https://www.youtube-nocookie.com',
          videoId,
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
          events: {
            onReady: () => {
              if (!cancelled) {
                window.clearTimeout(timeout);
                setReady(true);
                setFailed(false);
              }
            },
            onStateChange: (event) => {
              if (!cancelled) setPlaying(event.data === 1);
            },
            onError: () => {
              if (!cancelled) setFailed(true);
            },
          },
        });
        player.current = instance;
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      instance?.destroy();
      player.current = null;
    };
  }, [videoId, activated]);
  const toggle = () => {
    if (!activated) {
      setRequested(true);
      return;
    }
    if (!ready || !player.current) return;
    if (player.current.getPlayerState() === 1) player.current.pauseVideo();
    else player.current.playVideo();
  };
  return (
    <div className="relative h-full w-full bg-black">
      <div ref={host} className="absolute inset-0" />
      {!activated && (
        <>
          <img
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="rounded-xl bg-black/75 px-5 py-3 text-white">{translate('▶ Load video')}</span>
          </div>
        </>
      )}
      {!interactive && (
        <div
          role="button"
          tabIndex={0}
          aria-label={`${!activated ? translate('Load') : playing ? translate('Pause') : translate('Play')} ${title || 'video'}`}
          aria-disabled={activated && !ready}
          className="absolute inset-x-0 top-0 cursor-grab active:cursor-grabbing outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          style={{ bottom: ready ? 44 : 0 }}
          title={translate('Click to play or pause · Drag to move')}
          onMouseDown={(event) => {
            if (event.button === 0)
              gesture.current = { x: event.clientX, y: event.clientY, time: performance.now(), moved: false };
          }}
          onMouseMove={(event) => {
            const start = gesture.current;
            if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) start.moved = true;
          }}
          onClick={(event) => {
            const start = gesture.current;
            gesture.current = null;
            if (
              start &&
              (start.moved ||
                performance.now() - start.time > 350 ||
                Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6)
            )
              return;
            event.stopPropagation();
            toggle();
          }}
          onKeyDown={(event) => {
            if (event.key === ' ' || event.key === 'Enter') {
              event.preventDefault();
              event.stopPropagation();
              toggle();
            }
          }}
        />
      )}
      {activated && (!ready || failed) && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-white text-sm px-8 text-center">
          {failed ? (
            <a
              className="pointer-events-auto underline"
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              onMouseDown={(event) => event.stopPropagation()}
            >
              {translate('Video unavailable here — open on YouTube ↗')}
            </a>
          ) : (
            translate('Loading video…')
          )}
        </div>
      )}
    </div>
  );
}
