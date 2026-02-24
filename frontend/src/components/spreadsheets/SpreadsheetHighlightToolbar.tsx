'use client';

import React from 'react';

interface HighlightColorOption {
  id: string;
  label: string;
  value: string;
}

interface SpreadsheetHighlightToolbarProps {
  highlightMenuRef: React.RefObject<HTMLDivElement>;
  highlightTriggerRef: React.RefObject<HTMLButtonElement>;
  highlightMenuOpen: boolean;
  hasSelection: boolean;
  selectedHighlight: string;
  colors: HighlightColorOption[];
  onToggleMenu: () => void;
  onPickColor: (color: string) => void;
  onClear: () => void;
}

export default function SpreadsheetHighlightToolbar({
  highlightMenuRef,
  highlightTriggerRef,
  highlightMenuOpen,
  hasSelection,
  selectedHighlight,
  colors,
  onToggleMenu,
  onPickColor,
  onClear,
}: SpreadsheetHighlightToolbarProps) {
  return (
    <div className="flex items-center justify-start gap-2 px-2 py-2 border-b border-gray-200 bg-white">
      <div className="relative" ref={highlightMenuRef}>
        <button
          type="button"
          ref={highlightTriggerRef}
          onClick={(e) => {
            e.stopPropagation();
            onToggleMenu();
          }}
          disabled={!hasSelection}
          className="flex items-center gap-2 rounded border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          aria-haspopup="menu"
          aria-expanded={highlightMenuOpen}
          data-highlight-menu-trigger
          data-testid="highlight-button"
          title={hasSelection ? '' : 'Select a cell/row/column first'}
        >
          <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: selectedHighlight }} />
          Highlight
        </button>
        {highlightMenuOpen && (
          <div
            className="absolute left-0 mt-2 w-44 rounded-md border border-gray-200 bg-white shadow-lg z-30"
            role="menu"
            data-highlight-menu
          >
            {colors.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => onPickColor(color.value)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50"
                role="menuitem"
                data-testid={`highlight-color-${color.id}`}
              >
                <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: color.value }} />
                {color.label}
              </button>
            ))}
            <button
              type="button"
              onClick={onClear}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50"
              role="menuitem"
              data-testid="highlight-clear"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
