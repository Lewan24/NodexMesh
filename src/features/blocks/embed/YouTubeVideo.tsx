import { useEffect, useRef, useState } from 'react';
import { loadYouTubeApi } from './youtubeApi';
import type { YouTubePlayer } from './youtubeApi';

export default function YouTubeVideo({ videoId, title }: { videoId: string; title: string }) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const gesture = useRef<{ x: number; y: number; time: number; moved: boolean } | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let instance: YouTubePlayer | null = null;
    const timeout = window.setTimeout(() => { if (!cancelled) setFailed(true); }, 15000);
    setReady(false); setFailed(false); setPlaying(false);
    loadYouTubeApi().then(api => {
      if (cancelled || !host.current) return;
      const mount = document.createElement('div');
      host.current.replaceChildren(mount);
      instance = new api.Player(mount, {
        host: 'https://www.youtube-nocookie.com', videoId, width: '100%', height: '100%',
        playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: () => { if (!cancelled) { window.clearTimeout(timeout); setReady(true); setFailed(false); } },
          onStateChange: event => { if (!cancelled) setPlaying(event.data === 1); },
          onError: () => { if (!cancelled) setFailed(true); },
        },
      });
      player.current = instance;
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; window.clearTimeout(timeout); instance?.destroy(); player.current = null; };
  }, [videoId]);
  const toggle = () => {
    if (!ready || !player.current) return;
    if (player.current.getPlayerState() === 1) player.current.pauseVideo();
    else player.current.playVideo();
  };
  return <div className="relative h-full w-full bg-black">
    <div ref={host} className="absolute inset-0" />
    <div role="button" tabIndex={0} aria-label={`${playing ? 'Pause' : 'Play'} ${title || 'video'}`} aria-disabled={!ready} className="absolute inset-x-0 top-0 cursor-grab active:cursor-grabbing outline-none focus-visible:ring-2 focus-visible:ring-violet-400" style={{ bottom: ready ? 44 : 0 }} title="Click to play or pause · Drag to move"
      onMouseDown={event => { if (event.button === 0) gesture.current = { x: event.clientX, y: event.clientY, time: performance.now(), moved: false }; }}
      onMouseMove={event => { const start = gesture.current; if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) start.moved = true; }}
      onClick={event => {
        const start = gesture.current; gesture.current = null;
        if (start && (start.moved || performance.now() - start.time > 350 || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6)) return;
        event.stopPropagation(); toggle();
      }}
      onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); toggle(); } }} />
    {(!ready || failed) && <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-white text-sm px-8 text-center">{failed ? <a className="pointer-events-auto underline" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer" onMouseDown={event => event.stopPropagation()}>Video unavailable here — open on YouTube ↗</a> : 'Loading video…'}</div>}
  </div>;
}
