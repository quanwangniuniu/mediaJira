import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useEffect, useRef } from 'react';
import { OutlineItem } from './useOutline';

interface UseOutlineObserverProps {
  outlineItems: OutlineItem[];
  setActiveOutlineId: Dispatch<SetStateAction<string | null>>;
  isScrollingRef: React.MutableRefObject<boolean>;
  scrollRootRef: RefObject<HTMLDivElement | null>;
  scrollReady: boolean;
}

export default function useOutlineObserver({
  outlineItems,
  setActiveOutlineId,
  isScrollingRef,
  scrollRootRef,
  scrollReady,
}: UseOutlineObserverProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (outlineItems.length === 0) {
      setActiveOutlineId(null);
      return;
    }

    const root = scrollRootRef.current;
    if (!scrollReady || !root) {
      return;
    }

    if (observerRef.current) observerRef.current.disconnect();

    const visibleMap = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-block-id');
          if (!id) return;

          if (entry.isIntersecting) {
            visibleMap.set(id, entry.intersectionRatio);
          } else {
            visibleMap.delete(id);
          }
        });

        if (isScrollingRef.current) return;

        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        rafRef.current = requestAnimationFrame(() => {
          if (visibleMap.size === 0) {
            setActiveOutlineId(null);
            return;
          }
          const topId = [...visibleMap.entries()]
            .sort((a, b) => b[1] - a[1])[0][0];
          setActiveOutlineId((prev: string | null) => (prev !== topId ? topId : prev));
        });
      },
      {
        root,
        rootMargin: '0px 0px -70% 0px',
        threshold: [0, 0.1, 0.5, 1],
      }
    );

    const timer = setTimeout(() => {
      outlineItems.forEach(({ id }) => {
        const el = document.querySelector(
          `[data-block-id="${id}"]`
        );
        if (el) observerRef.current?.observe(el);
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      observerRef.current?.disconnect();
    };
  }, [outlineItems, scrollReady]);
}