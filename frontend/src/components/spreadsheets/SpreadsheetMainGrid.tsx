'use client';

import React from 'react';

type Coord = { row: number; col: number };

interface SpreadsheetMainGridProps {
  gridRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  rowNumberWidth: number;
  headerHeight: number;
  totalColumnWidth: number;
  totalRowHeight: number;
  leftSpacerWidth: number;
  rightSpacerWidth: number;
  visibleColCount: number;
  visibleStartCol: number;
  visibleRowCount: number;
  visibleStartRow: number;
  totalColumns: number;
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  resizeHandleSize: number;
  maxRows: number;
  rowCount: number;
  showAddRowsUI: boolean;
  addRowsInputValue: string;
  editValue: string;
  editingCell: string | null;
  isSingleCellSelection: boolean;
  isFilling: boolean;
  highlightCell?: Coord | null;
  activeCell: Coord | null;
  headerCellStyle: React.CSSProperties;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onCopy: (e: React.ClipboardEvent<HTMLDivElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLDivElement>) => void;
  onSelectAll: () => void;
  onColumnHeaderClick: (col: number) => void;
  onRowHeaderClick: (row: number) => void;
  onHeaderContextMenu: (type: 'row' | 'col', index: number, x: number, y: number) => void;
  onStartResize: (e: React.PointerEvent<HTMLDivElement>, type: 'col' | 'row', index: number) => void;
  onResizePointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onResizePointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onCellMouseDown: (e: React.MouseEvent, row: number, col: number) => void;
  onCellDoubleClick: (row: number, col: number) => void;
  onEditValueChange: (value: string) => void;
  onInputBlur: () => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFillHandlePointerDown: (e: React.PointerEvent<HTMLDivElement>, row: number, col: number) => void;
  onAddRowsInputChange: (value: string) => void;
  onAddRows: () => void;
  onCancelAddRows: () => void;
  getColumnWidth: (col: number) => number;
  getRowHeight: (row: number) => number;
  getCellKey: (row: number, col: number) => string;
  getCellDisplayValue: (row: number, col: number) => string;
  getHighlightColor: (row: number, col: number) => string | null;
  isRowHeaderSelected: (row: number) => boolean;
  isColumnHeaderSelected: (col: number) => boolean;
  isCellInSelection: (row: number, col: number) => boolean;
  isCellInFillPreview: (row: number, col: number) => boolean;
  columnIndexToLabel: (index: number) => string;
  getCellBaseStyle: (height: number) => React.CSSProperties;
  getCellInputStyle: (height: number) => React.CSSProperties;
  getCellContentStyle: (height: number) => React.CSSProperties;
}

export default function SpreadsheetMainGrid(props: SpreadsheetMainGridProps) {
  const {
    gridRef,
    inputRef,
    rowNumberWidth,
    headerHeight,
    totalColumnWidth,
    totalRowHeight,
    leftSpacerWidth,
    rightSpacerWidth,
    visibleColCount,
    visibleStartCol,
    visibleRowCount,
    visibleStartRow,
    totalColumns,
    topSpacerHeight,
    bottomSpacerHeight,
    resizeHandleSize,
    maxRows,
    rowCount,
    showAddRowsUI,
    addRowsInputValue,
    editValue,
    editingCell,
    isSingleCellSelection,
    isFilling,
    highlightCell,
    activeCell,
    headerCellStyle,
    onScroll,
    onKeyDown,
    onCopy,
    onPaste,
    onSelectAll,
    onColumnHeaderClick,
    onRowHeaderClick,
    onHeaderContextMenu,
    onStartResize,
    onResizePointerMove,
    onResizePointerUp,
    onCellMouseDown,
    onCellDoubleClick,
    onEditValueChange,
    onInputBlur,
    onInputKeyDown,
    onFillHandlePointerDown,
    onAddRowsInputChange,
    onAddRows,
    onCancelAddRows,
    getColumnWidth,
    getRowHeight,
    getCellKey,
    getCellDisplayValue,
    getHighlightColor,
    isRowHeaderSelected,
    isColumnHeaderSelected,
    isCellInSelection,
    isCellInFillPreview,
    columnIndexToLabel,
    getCellBaseStyle,
    getCellInputStyle,
    getCellContentStyle,
  } = props;

  return (
    <div
      ref={gridRef}
      className="flex-1 min-h-0 min-w-0 border border-gray-300 bg-white spreadsheet-scroll-container"
      style={{ overflowX: 'auto', overflowY: 'auto', position: 'relative' }}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      onCopy={onCopy}
      onPaste={onPaste}
      tabIndex={0}
    >
      <table
        className="border-collapse"
        style={{
          tableLayout: 'fixed',
          width: `${rowNumberWidth + totalColumnWidth}px`,
          height: `${headerHeight + totalRowHeight}px`,
          minHeight: `${headerHeight + totalRowHeight}px`,
        }}
      >
        <colgroup>
          <col style={{ width: `${rowNumberWidth}px`, minWidth: `${rowNumberWidth}px` }} />
          <col style={{ width: `${leftSpacerWidth}px`, minWidth: `${leftSpacerWidth}px` }} />
          {Array.from({ length: visibleColCount }).map((_, colIndex) => (
            <col
              key={colIndex}
              data-col-index={visibleStartCol + colIndex}
              data-testid={`col-width-${visibleStartCol + colIndex}`}
              style={{
                width: `${getColumnWidth(visibleStartCol + colIndex)}px`,
                minWidth: `${getColumnWidth(visibleStartCol + colIndex)}px`,
              }}
            />
          ))}
          <col style={{ width: `${rightSpacerWidth}px`, minWidth: `${rightSpacerWidth}px` }} />
        </colgroup>

        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            <th
              className="border border-gray-300 bg-gray-200 text-xs font-semibold text-gray-600 text-center sticky left-0 z-20"
              style={headerCellStyle}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onSelectAll}
              data-testid="select-all-cell"
            />
            <th className="border border-gray-300 bg-gray-200 p-0" style={{ width: `${leftSpacerWidth}px`, ...headerCellStyle }} />
            {Array.from({ length: visibleColCount }).map((_, colOffset) => {
              const colIndex = visibleStartCol + colOffset;
              const colWidth = getColumnWidth(colIndex);
              return (
                <th
                  key={colIndex}
                  className={`border border-gray-300 text-xs font-semibold text-gray-600 text-center relative overflow-visible ${
                    isColumnHeaderSelected(colIndex) ? 'bg-blue-100' : 'bg-gray-200'
                  }`}
                  style={{ width: `${colWidth}px`, minWidth: `${colWidth}px`, ...headerCellStyle }}
                  onClick={() => onColumnHeaderClick(colIndex)}
                  data-testid={`col-header-${colIndex}`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onHeaderContextMenu('col', colIndex, e.clientX, e.clientY);
                  }}
                >
                  {columnIndexToLabel(colIndex)}
                  <div
                    data-testid={`col-resize-handle-${colIndex}`}
                    className="absolute top-0"
                    style={{ right: `-${resizeHandleSize / 2}px`, width: `${resizeHandleSize}px`, height: '100%', cursor: 'col-resize' }}
                    onPointerDown={(e) => onStartResize(e, 'col', colIndex)}
                    onPointerMove={onResizePointerMove}
                    onPointerUp={onResizePointerUp}
                    onPointerCancel={onResizePointerUp}
                  />
                </th>
              );
            })}
            <th className="border border-gray-300 bg-gray-200 p-0" style={{ width: `${rightSpacerWidth}px`, ...headerCellStyle }} />
          </tr>
        </thead>

        <tbody>
          {topSpacerHeight > 0 && (
            <tr>
              <td colSpan={totalColumns} style={{ height: `${topSpacerHeight}px` }} />
            </tr>
          )}

          {Array.from({ length: visibleRowCount }).map((_, rowOffset) => {
            const row = visibleStartRow + rowOffset;
            const rowHeight = getRowHeight(row);
            const rowBaseStyle = getCellBaseStyle(rowHeight);
            return (
              <tr key={row}>
                <td
                  className={`border border-gray-300 text-xs font-semibold text-gray-600 text-center sticky left-0 z-10 overflow-visible ${
                    isRowHeaderSelected(row) ? 'bg-blue-100' : 'bg-gray-100'
                  }`}
                  style={rowBaseStyle}
                  data-testid={`row-header-${row}`}
                  onClick={() => onRowHeaderClick(row)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onHeaderContextMenu('row', row, e.clientX, e.clientY);
                  }}
                >
                  {row + 1}
                  <div
                    data-testid={`row-resize-handle-${row}`}
                    className="absolute left-0"
                    style={{ bottom: `-${resizeHandleSize / 2}px`, width: '100%', height: `${resizeHandleSize}px`, cursor: 'row-resize' }}
                    onPointerDown={(e) => onStartResize(e, 'row', row)}
                    onPointerMove={onResizePointerMove}
                    onPointerUp={onResizePointerUp}
                    onPointerCancel={onResizePointerUp}
                  />
                </td>
                <td className="border border-gray-300 p-0" style={{ width: `${leftSpacerWidth}px`, ...rowBaseStyle }} />
                {Array.from({ length: visibleColCount }).map((_, colOffset) => {
                  const col = visibleStartCol + colOffset;
                  const colWidth = getColumnWidth(col);
                  const key = getCellKey(row, col);
                  const isActive = activeCell && activeCell.row === row && activeCell.col === col;
                  const isHighlighted = highlightCell != null && highlightCell.row === row && highlightCell.col === col;
                  const isInSelection = isCellInSelection(row, col);
                  const isEditing = editingCell === key;
                  const showFillHandle = Boolean(isActive && isSingleCellSelection && !isEditing && !isFilling);
                  const displayValue = isEditing ? editValue : getCellDisplayValue(row, col);
                  const highlightColor = getHighlightColor(row, col);
                  const hasHighlight = Boolean(highlightColor);
                  let cellClassName = 'border border-gray-300 p-0 relative align-top';
                  if (isEditing) cellClassName += ' ring-2 ring-blue-600 ring-inset';
                  else if (isActive && isInSelection) cellClassName += hasHighlight ? ' ring-2 ring-blue-500 ring-inset' : ' ring-2 ring-blue-500 ring-inset bg-blue-50';
                  else if (isActive) cellClassName += ' ring-2 ring-blue-500 ring-inset';
                  else if (isInSelection && !hasHighlight) cellClassName += ' bg-blue-100';
                  if (isCellInFillPreview(row, col) && !hasHighlight) cellClassName += ' bg-blue-50';
                  if (isHighlighted) cellClassName += ' ring-2 ring-amber-400 ring-inset bg-amber-50';
                  return (
                    <td
                      key={`${row}-${col}`}
                      className={cellClassName}
                      onMouseDown={(e) => onCellMouseDown(e, row, col)}
                      onDoubleClick={() => onCellDoubleClick(row, col)}
                      style={{ width: `${colWidth}px`, minWidth: `${colWidth}px`, ...rowBaseStyle, ...(highlightColor ? { backgroundColor: highlightColor } : {}) }}
                      data-row={row}
                      data-col={col}
                    >
                      {isEditing ? (
                        <input
                            ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => onEditValueChange(e.target.value)}
                          onBlur={onInputBlur}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            onInputKeyDown(e);
                          }}
                          className="w-full"
                          style={{ width: `${colWidth}px`, minWidth: `${colWidth}px`, ...getCellInputStyle(rowHeight) }}
                        />
                      ) : (
                        <div className="text-gray-900" style={getCellContentStyle(rowHeight)}>
                          {displayValue}
                        </div>
                      )}
                      {showFillHandle && (
                        <div className="absolute bottom-0 right-0 h-2 w-2 bg-blue-600 border border-white cursor-crosshair" onPointerDown={(e) => onFillHandlePointerDown(e, row, col)} />
                      )}
                    </td>
                  );
                })}
                <td className="border border-gray-300 p-0" style={{ width: `${rightSpacerWidth}px`, ...rowBaseStyle }} />
              </tr>
            );
          })}

          {bottomSpacerHeight > 0 && (
            <tr>
              <td colSpan={totalColumns} style={{ height: `${bottomSpacerHeight}px` }} />
            </tr>
          )}
        </tbody>
      </table>

      {showAddRowsUI && rowCount < maxRows && (
        <div className="sticky bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-300 px-4 py-3 shadow-lg">
          <div className="flex items-center gap-3 max-w-md mx-auto">
            <span className="text-sm text-gray-700">Add rows:</span>
            <input
              type="number"
              min="1"
              max={maxRows - rowCount}
              value={addRowsInputValue}
              onChange={(e) => onAddRowsInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAddRows();
                } else if (e.key === 'Escape') {
                  onCancelAddRows();
                }
              }}
              className="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
              autoFocus
            />
            <button type="button" onClick={onAddRows} className="rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-700">
              Add
            </button>
            <button type="button" onClick={onCancelAddRows} className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <span className="text-xs text-gray-500 ml-auto">
              {rowCount.toLocaleString()} / {maxRows.toLocaleString()} rows
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
