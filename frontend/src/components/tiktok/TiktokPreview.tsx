'use client';

import React from 'react';
import { TiktokMaterialItem } from '@/lib/api/tiktokApi';

// CTA
type CtaMode = 'dynamic' | 'standard' | 'hidden';

// External props (controlled view model)
interface TiktokPreviewProps {
  creative: TiktokMaterialItem | null;

  // controlled placement
  placement?: 'In feed' | 'Search feed';
  onPlacementChange?: (p: 'In feed' | 'Search feed') => void;
  enablePlacementSwitch?: boolean;

  // identity & text
  identity?: { avatarUrl?: string; displayName?: string; sponsored?: boolean };
  text?: string; // Ad Details -> Text

  // CTA
  cta?: { mode: CtaMode; label?: string };

  // right side metrics (optional)
  metrics?: { likes?: number; comments?: number; bookmarks?: number; shares?: number };

  // search feed comment bar
  showCommentBarInSearch?: boolean;

  // UI controls
  allowFullscreen?: boolean;

  // images pagination/animation support
  images?: TiktokMaterialItem[];
  currentImageIndex?: number; // index in images when creative is image
  onImageIndexChange?: (nextIndex: number) => void;
}

const approxEqual = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;

const formatTime = (sec: number) => {
  if (!isFinite(sec)) return '00:00';
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
};

const placements = ['In feed', 'Search feed'] as const;

type Placement = typeof placements[number];

// Reusable phone frame that renders the TikTok UI overlays
const PhoneFrame: React.FC<{
  mediaUrl?: string;
  previewUrl?: string;
  placement: Placement;
  widthClass?: string; // tailwind width class, e.g. w-[320px]
  videoRef: React.RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  onLoadedMeta: (v: HTMLVideoElement) => void;
  onTimeUpdate: (t: number) => void;
  mediaType: 'video' | 'image' | 'none';
  imageSlideDir?: 'left' | 'right';
  imageAnimKey?: number;
  identityDisplay: string;
  textLine: string;
  sponsored: boolean;
  ctaMode: CtaMode;
  ctaLabel: string;
  showCTA: boolean;
  showCommentBarInSearch: boolean;
  metrics: { likes: number; comments: number; bookmarks: number; shares: number };
  avatarUrl?: string;
}> = ({ mediaUrl, previewUrl, placement, widthClass = 'w-[320px]', videoRef, isPlaying, setIsPlaying, onLoadedMeta, onTimeUpdate, mediaType, imageSlideDir, imageAnimKey, identityDisplay, textLine, sponsored, ctaMode, ctaLabel, showCTA, showCommentBarInSearch, metrics, avatarUrl }) => {
  const [natural, setNatural] = React.useState<{ w: number; h: number } | null>(null);
  const [isHovering, setIsHovering] = React.useState(false);
  const [imageTranslate, setImageTranslate] = React.useState<string>('translate-x-0');

  const ratio = React.useMemo(() => {
    if (!videoRef.current) return natural ? natural.w / natural.h : null;
    const w = videoRef.current.videoWidth || natural?.w || 0;
    const h = videoRef.current.videoHeight || natural?.h || 1;
    return w / h;
  }, [natural, videoRef]);

  const isSquare = React.useMemo(() => ratio !== null && approxEqual(ratio!, 1, 0.02), [ratio]);

  React.useEffect(() => {
    if (mediaType !== 'image') return;
    if (imageSlideDir === 'left') {
      setImageTranslate('translate-x-full');
      requestAnimationFrame(() => setImageTranslate('translate-x-0'));
    } else if (imageSlideDir === 'right') {
      setImageTranslate('-translate-x-full');
      requestAnimationFrame(() => setImageTranslate('translate-x-0'));
    } else {
      setImageTranslate('translate-x-0');
    }
  }, [imageAnimKey, imageSlideDir, mediaType]);

  return (
    <div className={`bg-black rounded-[28px] overflow-hidden aspect-[9/19.5] ${widthClass} mx-auto relative shadow-lg`}>
      <div
        className="w-full h-full relative"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {mediaType === 'video' ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className={`w-full h-full ${isSquare ? 'object-contain' : 'object-cover'} z-0`}
            style={isSquare ? { backgroundColor: 'black' } : undefined}
            controls={false}
            playsInline
            muted
            preload="metadata"
            poster={previewUrl}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget as HTMLVideoElement;
              setNatural({ w: v.videoWidth || 0, h: v.videoHeight || 0 });
              onLoadedMeta(v);
            }}
            onTimeUpdate={(e) => onTimeUpdate((e.currentTarget as HTMLVideoElement).currentTime)}
            onClick={() => {
              const v = videoRef.current; if (!v) return;
              if (v.paused) { v.play(); setIsPlaying(true); } else { v.pause(); setIsPlaying(false); }
            }}
          />
        ) : mediaType === 'image' && mediaUrl ? (
          <img
            key={imageAnimKey}
            src={mediaUrl}
            className={`w-full h-full object-contain bg-black transition-transform duration-400 ease-out ${imageTranslate}`}
            alt="preview"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-gray-600 to-gray-800 flex items-center justify-center">
            <svg className="w-14 h-14 text-white/70" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/></svg>
          </div>
        )}
        {mediaType === 'video' && !isPlaying && !previewUrl && (
          <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center z-[1]">
            <svg className="w-16 h-16 text-white/60" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v14H3V5zm7 3v8l6-4-6-4z"/></svg>
          </div>
        )}

        {/* Play/Pause overlay only for video */}
        {mediaType === 'video' && !!mediaUrl && (
        <button
          onClick={() => {
            const v = videoRef.current; if (!v) return;
            if (v.paused) { v.play(); setIsPlaying(true); } else { v.pause(); setIsPlaying(false); }
          }}
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${isHovering || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
          aria-label={isPlaying ? 'pause' : 'play'}
        >
          <span className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center">
            {isPlaying ? (
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M7 6h4v12H7zM13 6h4v12h-4z"/></svg>
            ) : (
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </span>
        </button>
        )}

        {/* Overlay arrows for image navigation */}
        {mediaType === 'image' && (
          <>
            <button
              type="button"
              className="absolute left-0 top-0 h-full w-1/4 flex items-center justify-start text-white/80 hover:text-white"
              onClick={(e) => { e.stopPropagation(); (window as any).__goPrev && (window as any).__goPrev(); }}
              aria-label="Previous image"
            >
              <span className="ml-2 text-2xl">‹</span>
            </button>
            <button
              type="button"
              className="absolute right-0 top-0 h-full w-1/4 flex items-center justify-end text-white/80 hover:text-white"
              onClick={(e) => { e.stopPropagation(); (window as any).__goNext && (window as any).__goNext(); }}
              aria-label="Next image"
            >
              <span className="mr-2 text-2xl">›</span>
            </button>
          </>
        )}

        {/* overlays for readability */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Common status bar (time/signal/wifi/battery) */}
        <div className="absolute top-0 left-0 right-0 text-white">
          <div className="flex items-center justify-between px-5 pt-3 text-[13px] opacity-95">
            <span className="text-[15px] font-semibold">9:41</span>
            <div className="flex items-center gap-2.5">
              {/* signal */}
              <div className="flex items-end gap-[1.5px]">
                <span className="w-[1.5px] h-1.5 bg-white rounded-sm" />
                <span className="w-[1.5px] h-[10px] bg-white rounded-sm" />
                <span className="w-[1.5px] h-[12px] bg-white rounded-sm" />
                <span className="w-[1.5px] h-[14px] bg-white rounded-sm" />
              </div>
              {/* wifi */}
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 20a2 2 0 100-4 2 2 0 000 4zm6.28-6.03l1.42-1.42A12.94 12.94 0 0012 8c-3.58 0-6.84 1.4-9.31 3.69l1.42 1.42A10.96 10.96 0 0112 10c2.98 0 5.69 1.16 7.78 3.03zM12 6a16.91 16.91 0 0111.31 4.31l-1.42 1.42A14.93 14.93 0 0012 8c-3.78 0-7.22 1.46-9.89 3.73L.69 10.31A16.91 16.91 0 0112 6z"/></svg>
              {/* battery */}
              <div className="w-6 h-3 rounded-sm border border-white relative">
                <div className="absolute right-[-2px] top-1/2 -translate-y-1/2 w-0.5 h-1.5 bg-white rounded-sm" />
                <div className="h-full w-4 bg-white rounded-l-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Placement-specific header rows under status bar */}
        {placement === 'In feed' ? (
          <div className="absolute top-8 left-0 right-0 flex items-center justify-center text-white transition-all duration-300">
            <div className="flex items-center space-x-8 text-sm">
              <span className="opacity-70">Following</span>
              <span className="font-semibold relative">For You
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 block w-8 h-[2px] bg-white rounded" />
              </span>
            </div>
            <div className="absolute right-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9.5 3a6.5 6.5 0 015.2 10.5l4.65 4.65-1.7 1.7-4.65-4.65A6.5 6.5 0 119.5 3zm0 2a4.5 4.5 0 100 9 4.5 4.5 0 000-9z"/></svg>
            </div>
          </div>
        ) : (
          <div className="absolute left-0 right-0 top-8 text-white transition-all duration-300">
            <div className="flex items-center mx-4">
              {/* back arrow */}
              <button className="p-2 -ml-1 mr-2 rounded-full hover:bg-white/10" aria-label="Back">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
              </button>
              {/* search capsule */}
              <div className="flex-1 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center px-3">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4a6 6 0 014.8 9.6l4.1 4.1-1.4 1.4-4.1-4.1A6 6 0 1110 4z"/></svg>
                <div className="flex-1" />
                <div className="h-4 w-px bg-white/40 mx-2" />
                <span className="text-sm opacity-85 pr-1">Search</span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom tab bar (In feed only) */}
        {placement === 'In feed' && (
          <div className="absolute left-0 right-0 bottom-0 bg-black/90 text-white px-6 py-2.5">
            <div className="flex items-center justify-between text-[11px]">
              {[
                { label: 'Home', icon: (<path d="M3 10l9-7 9 7v8a2 2 0 01-2 2h-4a2 2 0 01-2-2V13H9v5a2 2 0 01-2 2H3a2 2 0 01-2-2v-8z"/>) },
                { label: 'Friends', icon: (<path d="M16 11c1.66 0 3-1.34 3-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V20h14v-1.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.06 1.16.84 1.97 1.97 1.97 3.44V20h6v-1.5c0-2.33-4.67-3.5-7-3.5z"/>) },
                { label: '', icon: null, plus: true },
                { label: 'Inbox', icon: (<path d="M20 2H4a2 2 0 00-2 2v14l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/>) },
                { label: 'Me', icon: (<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/>) },
              ].map((it, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  {it.plus ? (
                    <div className="w-10 h-7 rounded-lg bg-white flex items-center justify-center text-black font-bold text-base">+</div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mb-1">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">{it.icon}</svg>
                    </div>
                  )}
                  {it.label && <span>{it.label}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right action bar (common) */}
        <div className="absolute right-2 bottom-28 flex flex-col items-center space-y-4 text-white">
          {[
            { icon: (<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>), label: metrics.likes >= 1000 ? `${Math.round(metrics.likes/1000)}K` : `${metrics.likes}` },
            { icon: (<path d="M20 2H4a2 2 0 00-2 2v14l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/>), label: `${metrics.comments}` },
            { icon: (<path d="M17 3H7a2 2 0 00-2 2v14l7-3 7 3V5a2 2 0 00-2-2z"/>), label: `${metrics.bookmarks}` },
            { icon: (<path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>), label: `${metrics.shares}` },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center text-xs">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-1">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">{item.icon}</svg>
              </div>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Caption & CTA */}
        <div className="absolute left-3 right-16 bottom-16 text-white">
          <div className="flex items-center space-x-2 mb-2">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20" />
            )}
            <div className="text-sm font-medium">{identityDisplay}</div>
          </div>
          <div className="text-sm opacity-90 mb-2">{textLine}</div>
          {sponsored && (
            <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-white/20 mr-2">Sponsored</span>
          )}
          {showCTA && ctaMode !== 'hidden' && (
            <button className="mt-3 w-48 h-10 rounded-md bg-[#ff4654] text-sm font-semibold">
              {ctaMode === 'dynamic' ? 'Dynamic call to action' : ctaLabel}
            </button>
          )}
        </div>

        {/* Add comment bar for Search feed */}
        {placement === 'Search feed' && showCommentBarInSearch && (
          <div className="absolute left-0 right-0 bottom-0 bg-black text-white">
            <div className="px-5 py-4 flex items-center gap-4">
              <span className="opacity-80 flex-1 text-sm">Add comment…</span>
              <button className="w-7 h-7 rounded-full border border-white/80 flex items-center justify-center" aria-label="mention">
                <span className="text-sm">@</span>
              </button>
              <button className="w-7 h-7 rounded-full border border-white/80 flex items-center justify-center" aria-label="emoji">
                <span className="text-base">☺️</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TiktokPreview: React.FC<TiktokPreviewProps> = (props) => {
  const {
    creative,
    placement = 'In feed',
    onPlacementChange,
    enablePlacementSwitch = true,
    identity,
    text,
    cta,
    metrics,
    showCommentBarInSearch = true,
    onImageIndexChange,
    allowFullscreen = true,
  } = props;
  // Paging handlers for images
  const goPrevImage = () => {
    if (!props.images || props.images.length === 0) return;
    const total = props.images.length;
    const idx = (props.currentImageIndex ?? 0) - 1;
    const next = idx < 0 ? 0 : idx;
    props.onImageIndexChange?.(next);
  };
  const goNextImage = () => {
    if (!props.images || props.images.length === 0) return;
    const total = props.images.length;
    const idx = (props.currentImageIndex ?? 0) + 1;
    const next = idx >= total ? total - 1 : idx;
    props.onImageIndexChange?.(next);
  };
  // Expose handlers for overlay arrow buttons
  (window as any).__goPrev = goPrevImage;
  (window as any).__goNext = goNextImage;

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = React.useState(0);
  const [current, setCurrent] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);
  const prevImageIndexRef = React.useRef<number | null>(null);
  const [imageAnimKey, setImageAnimKey] = React.useState(0);
  const [imageSlideDir, setImageSlideDir] = React.useState<'left' | 'right' | undefined>(undefined);

  const mediaUrl = creative?.previewUrl || creative?.fileUrl || creative?.url;

  // When media changes, reset playback state to ensure correct switching
  React.useEffect(() => {
    const v = videoRef.current;
    if (v) {
      try { v.pause(); } catch {}
      try { v.currentTime = 0; } catch {}
    }
    setIsPlaying(false);
    setCurrent(0);
    setDuration(0);
  }, [mediaUrl]);

  const handleLoaded = (v: HTMLVideoElement) => {
    setDuration(v.duration || 0);
  };

  const seekTo = (t: number) => {
    const v = videoRef.current; if (!v) return;
    v.currentTime = t;
    setCurrent(t);
  };

  // compute slide direction for images
  React.useEffect(() => {
    if (creative?.type !== 'image') return;
    const idx = props.currentImageIndex ?? -1;
    const prev = prevImageIndexRef.current;
    if (prev !== null && prev >= 0 && idx >= 0) {
      if (idx > prev) setImageSlideDir('left');
      else if (idx < prev) setImageSlideDir('right');
    }
    prevImageIndexRef.current = idx;
    setImageAnimKey((k) => k + 1);
  }, [creative?.id, props.currentImageIndex]);

  // ----- Derived display values -----
  const identityDisplay = identity?.displayName || 'Your identity';
  const textLine = (text ?? 'Your text will be shown here').trim();
  const sponsored = identity?.sponsored !== false; // default true
  const avatarUrl = identity?.avatarUrl;

  const ctaMode: CtaMode = cta?.mode ?? 'hidden';
  const ctaLabel = cta?.label || 'Call to action';
  const showCTA = true; 

  const metricVals = {
    likes: metrics?.likes ?? 991000,
    comments: metrics?.comments ?? 3456,
    bookmarks: metrics?.bookmarks ?? 810,
    shares: metrics?.shares ?? 1256,
  };

  return (
    <div className="p-6">
      {/* Header Row: icon + divider + fullscreen */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-black" />
          <div className="h-8 w-px bg-gray-200" />
        </div>
        {allowFullscreen && (
          <button
            className="w-9 h-9 rounded-md border flex items-center justify-center bg-gray-50"
            onClick={() => setShowModal(true)}
            aria-label="Open fullscreen preview"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h5V5H5v7h2V7zm10 0v5h2V5h-7v2h5zM7 17H5v7h7v-2H7v-5zm12 0h-5v2h7v-7h-2v5z"/></svg>
          </button>
        )}
      </div>

      {/* Placement row under header */}
      <div className="mb-3">
        {enablePlacementSwitch ? (
          <select
            className="w-full h-10 rounded-md bg-gray-100 border px-3 text-sm"
            value={placement}
            onChange={(e) => onPlacementChange?.(e.target.value as Placement)}
          >
            {placements.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        ) : (
          <div className="w-full h-10 rounded-md bg-gray-100 border px-3 text-sm flex items-center">
            {placement}
          </div>
        )}
      </div>

      {/* Phone frame (inline) with touch navigation for images */}
      <div
        onTouchStart={(e) => {
          if (creative?.type !== 'image') return;
          (e.currentTarget as any)._sx = e.changedTouches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (creative?.type !== 'image') return;
          const sx = (e.currentTarget as any)._sx;
          if (typeof sx !== 'number') return;
          const dx = e.changedTouches[0].clientX - sx;
          if (Math.abs(dx) > 40) {
            if (dx < 0) goNextImage(); else goPrevImage();
          }
        }}
      >
        <PhoneFrame
          mediaUrl={mediaUrl}
          previewUrl={creative?.previewUrl}
          placement={placement}
          widthClass="w-[320px]"
          videoRef={videoRef}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          onLoadedMeta={handleLoaded}
          onTimeUpdate={setCurrent}
          mediaType={creative ? (creative.type === 'image' ? 'image' : 'video') : 'none'}
          imageSlideDir={imageSlideDir}
          imageAnimKey={imageAnimKey}
          identityDisplay={identityDisplay}
          textLine={textLine}
          sponsored={sponsored}
          ctaMode={ctaMode}
          ctaLabel={ctaLabel}
          showCTA={showCTA}
          showCommentBarInSearch={props.showCommentBarInSearch ?? true}
          metrics={metricVals}
          avatarUrl={avatarUrl}
        />
      </div>

      {/* Controls below the frame */}
      {creative?.type === 'video' ? (
        <div className="w-[320px] mx-auto mt-3 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="flex-1 accent-black"
          />
          <div className="text-xs text-gray-700">{formatTime(current)} / {formatTime(duration)}</div>
        </div>
      ) : (
        <div className="w-[320px] mx-auto mt-3 flex items-center justify-center gap-4 text-gray-800">
          <button type="button" onClick={goPrevImage} className="px-2 text-xl opacity-70 hover:opacity-100">‹</button>
          <div className="px-4 py-2 rounded-md border">{(props.currentImageIndex ?? 0) + 1}</div>
          <span className="opacity-60">/ {(props.images?.length ?? 0)}</span>
          <button type="button" onClick={goNextImage} className="px-2 text-xl opacity-70 hover:opacity-100">›</button>
        </div>
      )}

      {/* Fullscreen modal */}
      {allowFullscreen && showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3" role="dialog" aria-modal>
          <div className="relative inline-block bg-white rounded-xl shadow-2xl max-w-[96vw]">
            {/* close near card edge */}
            <button
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white/95 flex items-center justify-center shadow"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.29-6.29z"/></svg>
            </button>
            <div className="p-3">
              <div className="w-[360px] mb-2">
                <select
                  className="w-full h-9 rounded-md bg-gray-100 border px-3 text-sm"
                  value={placement}
                  onChange={(e) => onPlacementChange?.(e.target.value as Placement)}
                >
                  {placements.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <PhoneFrame
                mediaUrl={mediaUrl}
                previewUrl={creative?.previewUrl}
                placement={placement}
                widthClass="w-[360px]"
                videoRef={videoRef}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                onLoadedMeta={handleLoaded}
                onTimeUpdate={setCurrent}
                mediaType={creative?.type === 'image' ? 'image' : 'video'}
                imageSlideDir={imageSlideDir}
                imageAnimKey={imageAnimKey}
                identityDisplay={identityDisplay}
                textLine={textLine}
                sponsored={sponsored}
                ctaMode={ctaMode}
                ctaLabel={ctaLabel}
                showCTA={showCTA}
                showCommentBarInSearch={props.showCommentBarInSearch ?? true}
                metrics={metricVals}
                avatarUrl={avatarUrl}
              />
              {creative?.type === 'video' ? (
                <div className="w-[360px] mt-3 flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={current}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    className="flex-1 accent-black"
                  />
                  <div className="text-xs text-gray-700">{formatTime(current)} / {formatTime(duration)}</div>
                </div>
              ) : (
                <div className="w-[360px] mt-3 flex items-center justify-center gap-4 text-gray-800">
                  <button type="button" onClick={goPrevImage} className="px-2 text-xl opacity-70 hover:opacity-100">‹</button>
                  <div className="px-4 py-2 rounded-md border">{(props.currentImageIndex ?? 0) + 1}</div>
                  <span className="opacity-60">/ {(props.images?.length ?? 0)}</span>
                  <button type="button" onClick={goNextImage} className="px-2 text-xl opacity-70 hover:opacity-100">›</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TiktokPreview;
