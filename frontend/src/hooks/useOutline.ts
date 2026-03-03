import type { RefObject } from 'react';
import { useMemo, useRef, useState, useCallback } from 'react';
import { EditorBlock } from '@/types/notion';
import useOutlineObserver from './useOutlineObserver';

const HEADING_TYPES = new Set([
  'heading_1',
  'heading_2',
  'heading_3',
  'heading',
  'h1',
  'h2',
  'h3',
]);

const headingLevel = (type: string): number => {
  if (type === 'heading_1' || type === 'h1') return 1;
  if (type === 'heading_2' || type === 'h2') return 2;
  return 3;
};

const stripHtml = (html: string): string => {
  if (typeof document === 'undefined') return html;
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

export interface OutlineItem {
  id: string;
  label: string;
  level: number;
}

export default function useOutline(
  blocks: EditorBlock[],
  editorScrollRef: RefObject<HTMLDivElement | null>,
  scrollReady: boolean
) {
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(null);

  const outlineItems = useMemo<OutlineItem[]>(() => {
    return blocks
      .filter((b) => HEADING_TYPES.has(b.type))
      .map((b) => ({
        id: b.id,
        label: stripHtml(b.html),
        level: headingLevel(b.type),
      }));
  }, [blocks]);

  const [hoveredOutlineId, setHoveredOutlineId] = useState<string | null>(null);
  const scrollLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollingRef = useRef(false);

  const handleOutlineClick = useCallback(
    (blockId: string) => {
      const container = editorScrollRef.current;
      if (!container) return;

      setActiveOutlineId(blockId);
      isScrollingRef.current = true;
      if (scrollLockTimerRef.current) clearTimeout(scrollLockTimerRef.current);

      const el = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement | null;
      if (el) {
        const elRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const scrollTop = container.scrollTop + (elRect.top - containerRect.top);
        container.scrollTo({ top: scrollTop, behavior: 'instant' });
      }
      scrollLockTimerRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);
    },
    [editorScrollRef]
  );

  useOutlineObserver({
    outlineItems,
    setActiveOutlineId,
    isScrollingRef,
    scrollRootRef: editorScrollRef,
    scrollReady,
  });

  return {
    outlineItems,
    activeOutlineId,
    hoveredOutlineId,
    setHoveredOutlineId,
    handleOutlineClick,
    resetActiveOutlineId: () => setActiveOutlineId(null),
  };
}