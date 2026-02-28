'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { OutlineItem } from '@/hooks/useOutline';
import OutlineSidebar from './OutlineSidebar';

interface OutlineOverlayProps {
  items: OutlineItem[];
  activeId: string | null;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  onItemClick: (id: string) => void;
  editorScrollRef?: RefObject<HTMLDivElement | null>;
}

/** Unified pill geometry: interaction zone = visual zone */
const PILL_GEOMETRY = { top: '38%', height: '65vh' } as const;
const VIEWPORT_INDICATOR_WIDTH = 6;

export default function OutlineOverlay({
  items,
  activeId,
  hoveredId,
  setHoveredId,
  onItemClick,
  editorScrollRef,
}: OutlineOverlayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewportIndicator, setViewportIndicator] = useState<{ top: number; height: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const root = editorScrollRef?.current;
    if (!root) return;

    const updateIndicator = () => {
      const { scrollTop, scrollHeight, clientHeight } = root;
      if (scrollHeight <= clientHeight) {
        setViewportIndicator(null);
        return;
      }
      const railHeight = clientHeight;
      const ratio = railHeight / scrollHeight;
      setViewportIndicator({
        top: (scrollTop / scrollHeight) * railHeight,
        height: Math.max(20, ratio * railHeight),
      });
    };

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateIndicator);
    };

    updateIndicator();
    root.addEventListener('scroll', handleScroll, { passive: true });
    const resizeObs = new ResizeObserver(handleScroll);
    resizeObs.observe(root);

    return () => {
      root.removeEventListener('scroll', handleScroll);
      resizeObs.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [editorScrollRef]);

  return (
    <div
      className="absolute inset-y-0 right-0 w-[64px] pointer-events-none z-20 no-scrollbar overflow-visible"
      style={{ overflow: 'visible', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {/* Hover bridge: uses PILL_GEOMETRY when collapsed; expands to cover TOC when open */}
      <div
        className={`absolute right-0 inset-y-0 w-[288px] no-scrollbar ${isExpanded ? 'pointer-events-auto' : 'pointer-events-none'}`}
        style={{ overflow: 'visible', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Visual pill: hit-area = PILL_GEOMETRY, only receives hover when collapsed */}
        <div
          className="absolute right-0 -translate-y-1/2 w-[6px] rounded-full flex flex-col bg-transparent cursor-pointer z-30 transition-opacity duration-200 ease-in-out pointer-events-auto no-scrollbar"
          style={{
            top: PILL_GEOMETRY.top,
            height: PILL_GEOMETRY.height,
            transform: 'translateY(-50%)',
            opacity: isExpanded ? 0 : 1,
            visibility: isExpanded ? 'hidden' : 'visible',
          }}
          aria-label="Outline"
          onMouseEnter={() => setIsExpanded(true)}
        >
          {viewportIndicator && !isExpanded && (
            <div
              className="absolute rounded z-20 pointer-events-none"
              style={{
                left: (6 - VIEWPORT_INDICATOR_WIDTH) / 2,
                top: viewportIndicator.top,
                width: VIEWPORT_INDICATOR_WIDTH,
                height: viewportIndicator.height,
                backgroundColor: 'rgba(156, 163, 175, 0.02)',
                border: '1px solid rgba(156, 163, 175, 0.05)',
              }}
            />
          )}
          <OutlineSidebar
            variant="pills"
            items={items.length ? items.filter((_, i) => i % 2 === 0) : Array(4).fill(null)}
            activeId={activeId}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            onItemClick={onItemClick}
          />
        </div>
        {/* TOC Panel: floating card, glassmorphism */}
        <div
          className={`absolute top-12 right-0 bottom-12 w-64 z-10 max-h-[calc(100vh-6rem)] overflow-hidden rounded-2xl shadow-2xl transition-all duration-200 ease-in-out bg-white/95 backdrop-blur-[10px] border border-gray-100 dark:border-white/10 dark:bg-white/90 ${isExpanded ? 'pointer-events-auto' : 'pointer-events-none'}`}
          style={{
            transform: isExpanded ? 'translateX(0)' : 'translateX(20px)',
            opacity: isExpanded ? 1 : 0,
          }}
        >
          <div
            className={`h-full max-h-[calc(100%-32px)] flex flex-col min-h-0 py-4 ${isExpanded ? 'overflow-y-auto' : 'overflow-visible'}`}
          >
            <OutlineSidebar
              variant="list"
              items={items}
              activeId={activeId}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              onItemClick={onItemClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
