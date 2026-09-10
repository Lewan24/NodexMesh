export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  getPlayerState(): number;
  destroy(): void;
}
interface PlayerOptions {
  host: string;
  videoId: string;
  width: string;
  height: string;
  playerVars: Record<string, string | number>;
  events: { onReady: () => void; onStateChange: (event: { data: number }) => void; onError: () => void };
}
interface YouTubeApi { Player: new (element: HTMLElement, options: PlayerOptions) => YouTubePlayer }
declare global {
  interface Window { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void }
}
let pending: Promise<YouTubeApi> | undefined;
export function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => { pending = undefined; script.remove(); reject(new Error('Could not load YouTube')); };
    document.head.appendChild(script);
  });
  return pending;
}
