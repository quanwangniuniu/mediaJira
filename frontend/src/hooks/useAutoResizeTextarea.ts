"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

type UseAutoResizeTextareaOptions = {
  enabled?: boolean;
  minHeight?: number;
};

export function useAutoResizeTextarea(
  value: string | null | undefined,
  options: UseAutoResizeTextareaOptions = {}
) {
  const { enabled = true, minHeight = 0 } = options;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resizeTextarea = useCallback(() => {
    if (!enabled) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const nextHeight = Math.max(textarea.scrollHeight, minHeight);
    textarea.style.height = `${nextHeight}px`;
  }, [enabled, minHeight]);

  useLayoutEffect(() => {
    resizeTextarea();
  }, [resizeTextarea, value]);

  return { textareaRef, resizeTextarea };
}

export default useAutoResizeTextarea;
