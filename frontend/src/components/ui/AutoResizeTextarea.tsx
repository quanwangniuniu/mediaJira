"use client";

import { type TextareaHTMLAttributes } from "react";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";

type AutoResizeTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  minHeightPx?: number;
};

export default function AutoResizeTextarea({
  minHeightPx = 28,
  className = "",
  value,
  onInput,
  rows: _rows,
  ...props
}: AutoResizeTextareaProps) {
  const normalizedValue =
    typeof value === "string" ? value : value == null ? "" : String(value);

  const { textareaRef, resizeTextarea } = useAutoResizeTextarea(normalizedValue, {
    minHeight: minHeightPx,
  });

  return (
    <textarea
      {...props}
      ref={textareaRef}
      rows={1}
      value={value}
      onInput={(event) => {
        resizeTextarea();
        onInput?.(event);
      }}
      className={`${className} resize-none overflow-hidden`}
    />
  );
}
