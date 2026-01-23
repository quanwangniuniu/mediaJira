"use client";

import React, { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Send, Trash2 } from "lucide-react";

// Compact actions menu triggered by a three-dot icon.
export type DraftActionMenuProps = {
  onEdit?: () => void;
  onSend?: () => void;
  onDelete?: () => void;
  size?: "sm" | "md";
};

export function DraftActionMenu({
  onEdit,
  onSend,
  onDelete,
  size = "md",
}: DraftActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const buttonSize = size === "sm" ? "p-1.5" : "p-2";
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className="relative inline-flex" ref={menuRef}>
      <button
        type="button"
        className={`${buttonSize} rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className={iconClass} />
      </button>
      {open ? (
        <div
          className="absolute right-0 z-10 mt-2 w-40 rounded-md border border-gray-200 bg-white shadow-lg"
          role="menu"
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              setOpen(false);
              onEdit?.();
            }}
            role="menuitem"
            disabled={!onEdit}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              setOpen(false);
              onSend?.();
            }}
            role="menuitem"
            disabled={!onSend}
          >
            <Send className="h-4 w-4" />
            Send
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              setOpen(false);
              onDelete?.();
            }}
            role="menuitem"
            disabled={!onDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
