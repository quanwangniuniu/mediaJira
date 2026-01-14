'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SpreadsheetAPI } from '@/lib/api/spreadsheetApi';
import toast from 'react-hot-toast';

interface SpreadsheetGridProps {
  spreadsheetId: number;
  sheetId: number;
}

type CellKey = string; // Format: `${row}:${col}` (0-based indices)

interface CellData {
  value: string; // For MVP, only string values
  isLoaded: boolean; // Track if cell was loaded from backend
}

interface PendingOperation {
  row: number;
  column: number;
  operation: 'set' | 'clear';
  value_type?: string;
  string_value?: string | null;
}

interface ActiveCell {
  row: number;
  col: number;
}

const DEFAULT_ROWS = 200;
const DEFAULT_COLUMNS = 52; // A-Z + AA-AZ
const ROW_HEIGHT = 24; // pixels
const OVERSCAN_ROWS = 30; // Load extra rows above/below viewport
const AUTO_GROW_ROWS = 200; // Add rows when scrolling near bottom
const AUTO_GROW_COLUMNS = 26; // Add columns when scrolling near right
const DEBOUNCE_MS = 500; // Debounce delay for batch writes
const RESIZE_DEBOUNCE_MS = 500; // Debounce delay for resize API calls
const MAX_ROWS = 10000;
const MAX_COLUMNS = 702; // ZZZ (26 * 27)

/**
 * Convert 0-based column index to Excel-style label (A, B, ..., Z, AA, AB, ...)
 * @param index 0-based column index
 * @returns Column label (A-Z, AA-ZZ, AAA-ZZZ, etc.)
 */
const columnIndexToLabel = (index: number): string => {
  if (index < 0) return '';
  if (index < 26) {
    return String.fromCharCode(65 + index); // A-Z
  }
  
  // For AA and beyond
  let result = '';
  let remaining = index;
  
  while (remaining >= 0) {
    result = String.fromCharCode(65 + (remaining % 26)) + result;
    remaining = Math.floor(remaining / 26) - 1;
  }
  
  return result;
};

const getCellKey = (row: number, col: number): CellKey => {
  return `${row}:${col}`;
};

const parseCellKey = (key: CellKey): { row: number; col: number } => {
  const [row, col] = key.split(':').map(Number);
  return { row, col };
};

// Cache cells per sheetId to maintain isolation
const cellCache = new Map<number, Map<CellKey, CellData>>();
const loadedRangesCache = new Map<number, Set<string>>(); // Set of range keys: `${startRow}-${endRow}-${startCol}-${endCol}`
// Cache dimensions per sheetId
const dimensionsCache = new Map<number, { rowCount: number; colCount: number }>();

export default function SpreadsheetGrid({ spreadsheetId, sheetId }: SpreadsheetGridProps) {
  const [rowCount, setRowCount] = useState(DEFAULT_ROWS);
  const [colCount, setColCount] = useState(DEFAULT_COLUMNS);
  const [cells, setCells] = useState<Map<CellKey, CellData>>(new Map());
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [editingCell, setEditingCell] = useState<CellKey | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [pendingOps, setPendingOps] = useState<Map<CellKey, PendingOperation>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resizeDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize dimensions and cells cache for this sheetId
  useEffect(() => {
    if (!cellCache.has(sheetId)) {
      cellCache.set(sheetId, new Map());
    }
    if (!loadedRangesCache.has(sheetId)) {
      loadedRangesCache.set(sheetId, new Set());
    }
    
    // Load cached dimensions or use defaults
    const cachedDimensions = dimensionsCache.get(sheetId);
    if (cachedDimensions) {
      setRowCount(cachedDimensions.rowCount);
      setColCount(cachedDimensions.colCount);
    }
    
    // Load cached cells for this sheet
    const cachedCells = cellCache.get(sheetId) || new Map();
    setCells(new Map(cachedCells));
  }, [sheetId]);

  // Expand dimensions if needed
  const ensureDimensions = useCallback(
    (minRow: number, minCol: number) => {
      let newRowCount = rowCount;
      let newColCount = colCount;
      let needsUpdate = false;

      if (minRow >= rowCount && rowCount < MAX_ROWS) {
        newRowCount = Math.min(MAX_ROWS, Math.max(rowCount + AUTO_GROW_ROWS, minRow + 1));
        needsUpdate = true;
      }

      if (minCol >= colCount && colCount < MAX_COLUMNS) {
        newColCount = Math.min(MAX_COLUMNS, Math.max(colCount + AUTO_GROW_COLUMNS, minCol + 1));
        needsUpdate = true;
      }

      if (needsUpdate) {
        setRowCount(newRowCount);
        setColCount(newColCount);
        dimensionsCache.set(sheetId, { rowCount: newRowCount, colCount: newColCount });
        
        // Debounced resize API call
        if (resizeDebounceTimerRef.current) {
          clearTimeout(resizeDebounceTimerRef.current);
        }
        resizeDebounceTimerRef.current = setTimeout(async () => {
          try {
            await SpreadsheetAPI.resizeSheet(spreadsheetId, sheetId, newRowCount, newColCount);
          } catch (error: any) {
            console.error('Failed to persist sheet dimensions:', error);
            // Non-blocking error - dimensions are still updated locally
          }
        }, RESIZE_DEBOUNCE_MS);
      }
    },
    [rowCount, colCount, sheetId, spreadsheetId]
  );

  // Compute visible range from scroll position
  const computeVisibleRange = useCallback((): {
    startRow: number;
    endRow: number;
    startColumn: number;
    endColumn: number;
  } => {
    if (!gridRef.current) {
      return { startRow: 0, endRow: Math.min(50, rowCount - 1), startColumn: 0, endColumn: colCount - 1 };
    }

    const container = gridRef.current;
    const scrollTop = container.scrollTop;
    const scrollLeft = container.scrollLeft;
    const containerHeight = container.clientHeight;
    const containerWidth = container.clientWidth;

    // Account for header height (approximately 24px)
    const headerHeight = 24;
    const adjustedScrollTop = Math.max(0, scrollTop - headerHeight);

    const startRow = Math.max(0, Math.floor(adjustedScrollTop / ROW_HEIGHT) - OVERSCAN_ROWS);
    const endRow = Math.min(
      rowCount - 1,
      Math.ceil((adjustedScrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN_ROWS
    );

    // For columns, we'll load all visible columns for now (can optimize later)
    const startColumn = 0;
    const endColumn = colCount - 1;

    return { startRow, endRow, startColumn, endColumn };
  }, [rowCount, colCount]);

  // Check if range is already loaded
  const isRangeLoaded = useCallback(
    (startRow: number, endRow: number, startColumn: number, endColumn: number): boolean => {
      const rangeKey = `${startRow}-${endRow}-${startColumn}-${endColumn}`;
      const loadedRanges = loadedRangesCache.get(sheetId);
      return loadedRanges?.has(rangeKey) || false;
    },
    [sheetId]
  );

  // Mark range as loaded
  const markRangeLoaded = useCallback(
    (startRow: number, endRow: number, startColumn: number, endColumn: number) => {
      const rangeKey = `${startRow}-${endRow}-${startColumn}-${endColumn}`;
      const loadedRanges = loadedRangesCache.get(sheetId);
      if (loadedRanges) {
        loadedRanges.add(rangeKey);
      }
    },
    [sheetId]
  );

  // Load cells from backend for a range
  const loadCellRange = useCallback(
    async (startRow: number, endRow: number, startColumn: number, endColumn: number) => {
      if (isRangeLoaded(startRow, endRow, startColumn, endColumn)) {
        return; // Already loaded
      }

      try {
        const response = await SpreadsheetAPI.readCellRange(
          spreadsheetId,
          sheetId,
          startRow,
          endRow,
          startColumn,
          endColumn
        );

        // Update cells from response
        setCells((prev) => {
          const next = new Map(prev);
          const cachedCells = cellCache.get(sheetId) || new Map();

          response.cells.forEach((cell) => {
            const key = getCellKey(cell.row_position, cell.column_position);
            // For MVP, only handle string values
            const value = cell.string_value || '';
            const cellData: CellData = {
              value,
              isLoaded: true,
            };
            next.set(key, cellData);
            cachedCells.set(key, cellData);
          });

          cellCache.set(sheetId, cachedCells);
          return next;
        });

        markRangeLoaded(startRow, endRow, startColumn, endColumn);
      } catch (error: any) {
        console.error('Failed to load cell range:', error);
        // Don't show toast for background loading errors
      }
    },
    [spreadsheetId, sheetId, isRangeLoaded, markRangeLoaded]
  );

  // Load initial visible range on mount and when sheetId changes
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const range = computeVisibleRange();
      loadCellRange(range.startRow, range.endRow, range.startColumn, range.endColumn);
    }, 100);

    return () => clearTimeout(timer);
  }, [sheetId, computeVisibleRange, loadCellRange]);

  // Handle scroll to load more cells and auto-grow rows/columns
  const handleScroll = useCallback(() => {
    const range = computeVisibleRange();
    loadCellRange(range.startRow, range.endRow, range.startColumn, range.endColumn);

    // Auto-grow rows when scrolling near bottom
    if (gridRef.current) {
      const container = gridRef.current;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // If within 500px of bottom, add more rows
      if (distanceFromBottom < 500 && rowCount < MAX_ROWS) {
        ensureDimensions(rowCount + AUTO_GROW_ROWS, colCount);
      }

      // Auto-grow columns when scrolling near right
      const scrollLeft = container.scrollLeft;
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      const distanceFromRight = scrollWidth - scrollLeft - clientWidth;

      // If within 500px of right, add more columns
      if (distanceFromRight < 500 && colCount < MAX_COLUMNS) {
        ensureDimensions(rowCount, colCount + AUTO_GROW_COLUMNS);
      }
    }
  }, [computeVisibleRange, loadCellRange, rowCount, colCount, ensureDimensions]);

  // Debounced batch save
  const flushPendingOps = useCallback(async () => {
    if (pendingOps.size === 0 || isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    // Merge operations by cell (last write wins)
    const operations: PendingOperation[] = Array.from(pendingOps.values());

    try {
      await SpreadsheetAPI.batchUpdateCells(spreadsheetId, sheetId, operations, true);
      setPendingOps(new Map()); // Clear queue on success
    } catch (error: any) {
      console.error('Failed to save cells:', error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        'Failed to save cells';
      setSaveError(errorMessage);
      toast.error(errorMessage, { duration: 3000 });
      // Keep queue on failure so user can retry
    } finally {
      setIsSaving(false);
    }
  }, [pendingOps, spreadsheetId, sheetId, isSaving]);

  // Debounce flush
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (pendingOps.size > 0) {
      debounceTimerRef.current = setTimeout(() => {
        flushPendingOps();
      }, DEBOUNCE_MS);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [pendingOps, flushPendingOps]);

  // Get cell value (from local state)
  const getCellValue = useCallback(
    (row: number, col: number): string => {
      const key = getCellKey(row, col);
      const cellData = cells.get(key);
      return cellData?.value || '';
    },
    [cells]
  );

  // Set cell value (optimistic update + enqueue for save)
  const setCellValue = useCallback(
    (row: number, col: number, value: string) => {
      const key = getCellKey(row, col);
      const trimmedValue = value.trim();

      // Update local state immediately (optimistic UI)
      setCells((prev) => {
        const next = new Map(prev);
        const cellData: CellData = {
          value: trimmedValue,
          isLoaded: true,
        };
        next.set(key, cellData);

        // Also update cache
        const cachedCells = cellCache.get(sheetId) || new Map();
        cachedCells.set(key, cellData);
        cellCache.set(sheetId, cachedCells);

        return next;
      });

      // Enqueue operation for saving
      setPendingOps((prev) => {
        const next = new Map(prev);
        const operation: PendingOperation = {
          row, // 0-based
          column: col, // 0-based
          operation: trimmedValue === '' ? 'clear' : 'set',
          ...(trimmedValue !== '' && {
            value_type: 'string',
            string_value: trimmedValue,
          }),
        };
        next.set(key, operation); // Last write wins
        return next;
      });
    },
    [sheetId]
  );

  // Navigate to a cell
  const navigateToCell = useCallback(
    (row: number, col: number) => {
      // Ensure dimensions are sufficient
      ensureDimensions(row, col);
      
      // Clamp to valid range
      const clampedRow = Math.max(0, Math.min(row, rowCount - 1));
      const clampedCol = Math.max(0, Math.min(col, colCount - 1));
      
      setActiveCell({ row: clampedRow, col: clampedCol });
      setEditingCell(null);
      
      // Scroll cell into view if needed
      if (gridRef.current) {
        const container = gridRef.current;
        const cellTop = clampedRow * ROW_HEIGHT;
        const cellBottom = cellTop + ROW_HEIGHT;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        
        if (cellTop < containerTop) {
          container.scrollTop = cellTop;
        } else if (cellBottom > containerBottom) {
          container.scrollTop = cellBottom - container.clientHeight;
        }
      }
    },
    [rowCount, colCount, ensureDimensions]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (editingCell) {
        // If editing, only handle Escape
        if (e.key === 'Escape') {
          e.preventDefault();
          setEditingCell(null);
          setEditValue('');
        }
        return;
      }

      if (!activeCell) {
        // If no active cell, start at (0, 0)
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'].includes(e.key)) {
          e.preventDefault();
          navigateToCell(0, 0);
        }
        return;
      }

      const { row, col } = activeCell;
      let newRow = row;
      let newCol = col;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          newRow = Math.max(0, row - 1);
          navigateToCell(newRow, col);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newRow = Math.min(rowCount - 1, row + 1);
          ensureDimensions(newRow, col);
          navigateToCell(newRow, col);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newCol = Math.max(0, col - 1);
          navigateToCell(row, newCol);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newCol = Math.min(colCount - 1, col + 1);
          ensureDimensions(row, newCol);
          navigateToCell(row, newCol);
          break;
        case 'Tab':
          e.preventDefault();
          if (col < colCount - 1) {
            newCol = col + 1;
          } else {
            // Wrap to next row
            newRow = Math.min(rowCount - 1, row + 1);
            newCol = 0;
            ensureDimensions(newRow, newCol);
          }
          navigateToCell(newRow, newCol);
          break;
        case 'Enter':
          e.preventDefault();
          // Enter edit mode
          const key = getCellKey(row, col);
          const value = getCellValue(row, col);
          setEditingCell(key);
          setEditValue(value);
          break;
        case 'Escape':
          e.preventDefault();
          setEditingCell(null);
          setEditValue('');
          break;
      }
    },
    [activeCell, editingCell, rowCount, colCount, navigateToCell, ensureDimensions, getCellValue]
  );

  // Handle cell click
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      navigateToCell(row, col);
    },
    [navigateToCell]
  );

  // Handle cell double click
  const handleCellDoubleClick = useCallback(
    (row: number, col: number) => {
      const key = getCellKey(row, col);
      const value = getCellValue(row, col);
      setEditingCell(key);
      setEditValue(value);
    },
    [getCellValue]
  );

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Handle commit cell edit
  const handleCommitEdit = useCallback(() => {
    if (!editingCell) return;

    const { row, col } = parseCellKey(editingCell);
    setCellValue(row, col, editValue);
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, setCellValue]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  // Handle input blur
  const handleInputBlur = useCallback(() => {
    handleCommitEdit();
  }, [handleCommitEdit]);

  // Handle input keydown
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCommitEdit();
        // Move to next row after commit
        if (activeCell) {
          const nextRow = Math.min(rowCount - 1, activeCell.row + 1);
          ensureDimensions(nextRow, activeCell.col);
          navigateToCell(nextRow, activeCell.col);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelEdit();
      }
    },
    [handleCommitEdit, handleCancelEdit, activeCell, rowCount, navigateToCell, ensureDimensions]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (resizeDebounceTimerRef.current) {
        clearTimeout(resizeDebounceTimerRef.current);
      }
    };
  }, []);

  const selectedCellKey = activeCell ? getCellKey(activeCell.row, activeCell.col) : null;

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Save status indicator */}
      {saveError && (
        <div className="absolute top-2 right-2 z-30 bg-red-50 border border-red-200 text-red-700 px-3 py-1 rounded text-xs">
          {saveError}
        </div>
      )}
      {isSaving && pendingOps.size > 0 && (
        <div className="absolute top-2 right-2 z-30 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded text-xs">
          Saving...
        </div>
      )}

      {/* Scrollable Grid Container */}
      <div
        ref={gridRef}
        className="flex-1 overflow-auto border border-gray-300 bg-white"
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '50px', minWidth: '50px' }} /> {/* Row numbers column */}
            {Array.from({ length: colCount }).map((_, colIndex) => (
              <col key={colIndex} style={{ width: '120px', minWidth: '120px' }} />
            ))}
          </colgroup>

          {/* Column Headers */}
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="border border-gray-300 bg-gray-200 p-1 text-xs font-semibold text-gray-600 text-center sticky left-0 z-20">
                {/* Empty corner cell */}
              </th>
              {Array.from({ length: colCount }).map((_, colIndex) => (
                <th
                  key={colIndex}
                  className="border border-gray-300 bg-gray-200 p-1 text-xs font-semibold text-gray-600 text-center"
                >
                  {columnIndexToLabel(colIndex)}
                </th>
              ))}
            </tr>
          </thead>

          {/* Grid Body */}
          <tbody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => {
              const row = rowIndex; // 0-based for API
              return (
                <tr key={rowIndex}>
                  {/* Row Number */}
                  <td className="border border-gray-300 bg-gray-100 p-1 text-xs font-semibold text-gray-600 text-center sticky left-0 z-10">
                    {row + 1}
                  </td>

                  {/* Data Cells */}
                  {Array.from({ length: colCount }).map((_, colIndex) => {
                    const col = colIndex; // 0-based for API
                    const key = getCellKey(row, col);
                    const isSelected = selectedCellKey === key;
                    const isEditing = editingCell === key;
                    const displayValue = isEditing ? editValue : getCellValue(row, col);

                    return (
                      <td
                        key={colIndex}
                        className={`border border-gray-300 p-0 relative ${
                          isSelected && !isEditing ? 'ring-2 ring-blue-500 ring-inset' : ''
                        } ${isEditing ? 'ring-2 ring-blue-600 ring-inset' : ''}`}
                        onClick={() => handleCellClick(row, col)}
                        onDoubleClick={() => handleCellDoubleClick(row, col)}
                        style={{ minWidth: '120px', height: `${ROW_HEIGHT}px` }}
                      >
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleInputBlur}
                            onKeyDown={handleInputKeyDown}
                            className="w-full h-full px-1 text-sm outline-none"
                            style={{ minWidth: '120px', height: `${ROW_HEIGHT}px` }}
                          />
                        ) : (
                          <div className="px-1 py-0.5 text-sm text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                            {displayValue}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
