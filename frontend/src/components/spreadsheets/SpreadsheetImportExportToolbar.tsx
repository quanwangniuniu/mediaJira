'use client';

import { createPortal } from 'react-dom';
import React from 'react';

interface ExportMenuAnchor {
  top: number;
  left: number;
  width: number;
}

interface SpreadsheetImportExportToolbarProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  exportMenuRef: React.RefObject<HTMLDivElement>;
  exportTriggerRef: React.RefObject<HTMLButtonElement>;
  isImporting: boolean;
  isReverting: boolean;
  hasUndoOperation: boolean;
  exportMenuOpen: boolean;
  exportMenuAnchor: ExportMenuAnchor | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUndo: () => void;
  onImportClick: () => void;
  onToggleExportMenu: (anchor: ExportMenuAnchor | null) => void;
  onCloseExportMenu: () => void;
  onExportCSV: () => void;
  onExportXLSX: () => void;
}

export default function SpreadsheetImportExportToolbar({
  fileInputRef,
  exportMenuRef,
  exportTriggerRef,
  isImporting,
  isReverting,
  hasUndoOperation,
  exportMenuOpen,
  exportMenuAnchor,
  onFileChange,
  onUndo,
  onImportClick,
  onToggleExportMenu,
  onCloseExportMenu,
  onExportCSV,
  onExportXLSX,
}: SpreadsheetImportExportToolbarProps) {
  return (
    <div className="flex items-center justify-start gap-2 px-2 py-2 border-b border-gray-200 bg-white">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={onFileChange}
      />
      <button
        type="button"
        onClick={onUndo}
        disabled={!hasUndoOperation || isReverting}
        className="rounded border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        Undo
      </button>
      <button
        type="button"
        onClick={onImportClick}
        disabled={isImporting}
        className="rounded border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        Import
      </button>
      <div className="relative" ref={exportMenuRef}>
        <button
          type="button"
          ref={exportTriggerRef}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            const rect = exportTriggerRef.current?.getBoundingClientRect();
            if (rect) {
              onToggleExportMenu({
                top: rect.bottom + 6,
                left: rect.right,
                width: rect.width,
              });
            } else {
              onToggleExportMenu(null);
            }
          }}
          disabled={isImporting}
          className="rounded border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          aria-haspopup="menu"
          aria-expanded={exportMenuOpen}
          data-export-menu-trigger
        >
          Export
        </button>
        {exportMenuOpen &&
          exportMenuAnchor &&
          createPortal(
            <div
              className="fixed z-[1000] w-40 rounded-md border border-gray-200 bg-white shadow-lg"
              style={{
                top: exportMenuAnchor.top,
                left: exportMenuAnchor.left - 160,
              }}
              role="menu"
              data-export-menu
            >
              <button
                type="button"
                onClick={() => {
                  onExportCSV();
                  onCloseExportMenu();
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50"
                role="menuitem"
              >
                Export as CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  onExportXLSX();
                  onCloseExportMenu();
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50"
                role="menuitem"
              >
                Export as XLSX
              </button>
            </div>,
            document.body
          )}
      </div>
    </div>
  );
}
