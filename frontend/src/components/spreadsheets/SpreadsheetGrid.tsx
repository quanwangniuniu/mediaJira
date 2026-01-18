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

interface SelectionRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

interface CellChange {
  row: number;
  col: number;
  prevValue: string;
  nextValue: string;
}

interface HistoryEntry {
  changes: CellChange[];
}

const DEFAULT_ROWS = 200;
const DEFAULT_COLUMNS = 52; // A-Z + AA-AZ
const ROW_HEIGHT = 24; // pixels
const COLUMN_WIDTH = 120; // pixels
const ROW_NUMBER_WIDTH = 50; // pixels
const HEADER_HEIGHT = 24; // pixels
const CELL_PADDING_X = 4; // pixels
const CELL_PADDING_Y = 2; // pixels
const CELL_FONT_SIZE = 12; // pixels (matches text-sm)
const OVERSCAN_ROWS = 20; // Render extra rows above/below viewport
const OVERSCAN_COLUMNS = 6; // Render extra columns left/right of viewport
const AUTO_GROW_ROWS = 50; // Batch add rows when expanding
const AUTO_GROW_COLUMNS = 50; // Batch add columns when expanding
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

/**
 * Parse a TSV (tab-separated values) string into a 2D array of strings.
 *
 * - Rows are separated by `\n` or `\r\n`
 * - Columns are separated by `\t`
 * - Trailing empty rows are discarded (to match Excel / Sheets behavior)
 */
const parseTSV = (text: string): string[][] => {
  if (!text) return [];

  // Normalize newlines and split into rows
  const rawRows = text.replace(/\r\n/g, '\n').split('\n');

  // Drop trailing empty rows
  while (rawRows.length > 0 && rawRows[rawRows.length - 1] === '') {
    rawRows.pop();
  }

  if (rawRows.length === 0) return [];

  return rawRows.map((row) => row.split('\t'));
};

export default function SpreadsheetGrid({ spreadsheetId, sheetId }: SpreadsheetGridProps) {
  const [rowCount, setRowCount] = useState(DEFAULT_ROWS);
  const [colCount, setColCount] = useState(DEFAULT_COLUMNS);
  const [cells, setCells] = useState<Map<CellKey, CellData>>(new Map());
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [anchorCell, setAnchorCell] = useState<ActiveCell | null>(null); // Selection start point
  const [focusCell, setFocusCell] = useState<ActiveCell | null>(null); // Selection end point
  const [isSelecting, setIsSelecting] = useState(false); // Track if mouse is down for selection
  const [editingCell, setEditingCell] = useState<CellKey | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [mode, setMode] = useState<'navigation' | 'edit'>('navigation');
  const [navigationLocked, setNavigationLocked] = useState(false);
  const [pendingOps, setPendingOps] = useState<Map<CellKey, PendingOperation>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [visibleRange, setVisibleRange] = useState({
    startRow: 0,
    endRow: Math.min(30, DEFAULT_ROWS - 1),
    startCol: 0,
    endCol: Math.min(10, DEFAULT_COLUMNS - 1),
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resizeDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSelectionRef = useRef<{ position: 'start' | 'end' | number } | null>(null);

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
    
    // Reset selection when switching sheets
    setActiveCell(null);
    setAnchorCell(null);
    setFocusCell(null);
    setIsSelecting(false);
    setHistory([]);
    setMode('navigation');
    setNavigationLocked(false);
  }, [sheetId]);

  /**
   * Push a new entry to the undo history stack.
   * Each entry groups one logical user action (edit, paste, batch delete).
   */
  const pushHistoryEntry = useCallback((entry: HistoryEntry) => {
    if (!entry.changes.length) return;
    setHistory((prev) => [...prev, entry]);
  }, []);

  // True when a cell editor is mounted and active.
  // In this mode, we must NOT handle grid-level keyboard shortcuts so that
  // native text editing (typing, Backspace/Delete, Ctrl/Cmd+Z, etc.) works.
  const isEditing = mode === 'edit';

  /**
   * State transitions:
   * - Navigation Mode: grid navigation/selection keys only
   * - Edit Mode: text input is active
   * - navigationLocked: when true, arrow keys move the caret within the input
   *   instead of navigating between cells
   */
  const enterEditMode = useCallback(
    (cell: ActiveCell, initialValue: string, locked: boolean, caret: 'start' | 'end' | number) => {
      const key = getCellKey(cell.row, cell.col);
      setActiveCell(cell);
      setEditingCell(key);
      setEditValue(initialValue);
      setMode('edit');
      setNavigationLocked(locked);
      pendingSelectionRef.current = { position: caret };
    },
    []
  );

  /**
   * Compute selection range from anchor and focus cells
   * 
   * Selection Model:
   * - anchorCell: The starting point of the selection (where user started selecting)
   * - focusCell: The current end point of the selection (where user is now)
   * - The actual selection rectangle is computed as the bounding box of these two points
   * 
   * This allows selection to work in any direction (up, down, left, right from anchor)
   * and enables future features like copy/paste operations on the selected range.
   * 
   * Returns null if no valid selection exists
   */
  const computeSelectionRange = useCallback((): SelectionRange | null => {
    if (!anchorCell || !focusCell) {
      return null;
    }
    
    return {
      startRow: Math.min(anchorCell.row, focusCell.row),
      endRow: Math.max(anchorCell.row, focusCell.row),
      startCol: Math.min(anchorCell.col, focusCell.col),
      endCol: Math.max(anchorCell.col, focusCell.col),
    };
  }, [anchorCell, focusCell]);

  /**
   * Check if a cell is within the selection range
   */
  const isCellInSelection = useCallback(
    (row: number, col: number): boolean => {
      const range = computeSelectionRange();
      if (!range) return false;
      
      return (
        row >= range.startRow &&
        row <= range.endRow &&
        col >= range.startCol &&
        col <= range.endCol
      );
    },
    [computeSelectionRange]
  );

  /**
   * Get an "effective" selection range:
   * - If a multi-cell selection exists, use that range.
   * - Otherwise, fall back to the active cell as a 1x1 range.
   *
   * This is used by copy/paste so they work even when only a single
   * active cell is selected.
   */
  const getEffectiveSelectionRange = useCallback((): SelectionRange | null => {
    const range = computeSelectionRange();
    if (range) {
      return range;
    }

    if (activeCell) {
      return {
        startRow: activeCell.row,
        endRow: activeCell.row,
        startCol: activeCell.col,
        endCol: activeCell.col,
      };
    }

    return null;
  }, [computeSelectionRange, activeCell]);

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
      return {
        startRow: 0,
        endRow: Math.min(30, rowCount - 1),
        startColumn: 0,
        endColumn: Math.min(10, colCount - 1),
      };
    }

    const container = gridRef.current;
    const scrollTop = container.scrollTop;
    const scrollLeft = container.scrollLeft;
    const containerHeight = container.clientHeight;
    const containerWidth = container.clientWidth;

    // Account for header height
    const adjustedScrollTop = Math.max(0, scrollTop - HEADER_HEIGHT);

    const startRow = Math.max(0, Math.floor(adjustedScrollTop / ROW_HEIGHT) - OVERSCAN_ROWS);
    const endRow = Math.min(
      rowCount - 1,
      Math.ceil((adjustedScrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN_ROWS
    );

    // Account for row number column width for horizontal range
    const dataViewportWidth = Math.max(0, containerWidth - ROW_NUMBER_WIDTH);
    const startColumn = Math.max(0, Math.floor(scrollLeft / COLUMN_WIDTH) - OVERSCAN_COLUMNS);
    const endColumn = Math.min(
      colCount - 1,
      Math.ceil((scrollLeft + dataViewportWidth) / COLUMN_WIDTH) + OVERSCAN_COLUMNS
    );

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
      setVisibleRange({
        startRow: range.startRow,
        endRow: range.endRow,
        startCol: range.startColumn,
        endCol: range.endColumn,
      });
      loadCellRange(range.startRow, range.endRow, range.startColumn, range.endColumn);
    }, 100);

    return () => clearTimeout(timer);
  }, [sheetId, computeVisibleRange, loadCellRange]);

  // Handle scroll to load more cells and auto-grow rows/columns
  const handleScroll = useCallback(() => {
    const range = computeVisibleRange();
    loadCellRange(range.startRow, range.endRow, range.startColumn, range.endColumn);
    setVisibleRange({
      startRow: range.startRow,
      endRow: range.endRow,
      startCol: range.startColumn,
      endCol: range.endColumn,
    });

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

  // Recompute visible range if dimensions change (e.g., after expansion)
  useEffect(() => {
    const range = computeVisibleRange();
    setVisibleRange({
      startRow: range.startRow,
      endRow: range.endRow,
      startCol: range.startColumn,
      endCol: range.endColumn,
    });
  }, [rowCount, colCount, computeVisibleRange]);

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
    (row: number, col: number, clearSelection: boolean = true) => {
      // Ensure dimensions are sufficient
      ensureDimensions(row, col);
      
      // Clamp to valid range
      const clampedRow = Math.max(0, Math.min(row, rowCount - 1));
      const clampedCol = Math.max(0, Math.min(col, colCount - 1));
      
      const newCell = { row: clampedRow, col: clampedCol };
      setActiveCell(newCell);
      setEditingCell(null);
      
      // Clear selection if requested (default behavior for single cell navigation)
      if (clearSelection) {
        setAnchorCell(null);
        setFocusCell(null);
      }
      
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

  // Handle keyboard navigation (Navigation Mode only)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // When editing a cell, let the browser and the input handle ALL keys.
      // This preserves native text editing behavior (typing, Backspace/Delete,
      // Ctrl/Cmd+Z, Ctrl/Cmd+C/V, arrow keys within the text, etc).
      if (isEditing) {
        return;
      }

      if (!activeCell) {
        // If no active cell, start at (0, 0)
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'].includes(e.key)) {
          e.preventDefault();
          navigateToCell(0, 0);
        }
      }

      const targetCell = activeCell ?? { row: 0, col: 0 };

      // Typing entry -> Edit Mode (navigationLocked=false)
      const isPrintable =
        e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey;
      if (isPrintable || e.key === ' ' || e.key === 'Tab') {
        e.preventDefault();
        const charToInsert = e.key === 'Tab' ? '\t' : e.key;
        enterEditMode(targetCell, charToInsert, false, 'end');
        return;
      }

      // Enter -> Edit Mode (navigationLocked=true)
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = getCellValue(targetCell.row, targetCell.col);
        enterEditMode(targetCell, value, true, 'end');
        return;
      }

      const { row, col } = targetCell;
      let newRow = row;
      let newCol = col;
      const isShiftPressed = e.shiftKey;

      // Global undo (Ctrl/Cmd+Z) when not editing
      if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();

        setHistory((prev) => {
          if (!prev.length) return prev;
          const last = prev[prev.length - 1];

          // Revert all cells in the last history entry
          last.changes.forEach((change) => {
            setCellValue(change.row, change.col, change.prevValue);
          });

          return prev.slice(0, -1);
        });

        return;
      }

      switch (e.key) {
        case 'Backspace':
        case 'Delete': {
          // Batch clear selected cells (or the active cell if no range)
          e.preventDefault();
          const rangeToClear = getEffectiveSelectionRange();
          if (!rangeToClear) {
            return;
          }

          const changes: CellChange[] = [];
          for (let r = rangeToClear.startRow; r <= rangeToClear.endRow; r++) {
            for (let c = rangeToClear.startCol; c <= rangeToClear.endCol; c++) {
              const prevValue = getCellValue(r, c);
              const nextValue = '';
              if (prevValue === nextValue) continue;

              changes.push({
                row: r,
                col: c,
                prevValue,
                nextValue,
              });

              setCellValue(r, c, nextValue);
            }
          }

          if (changes.length) {
            pushHistoryEntry({ changes });
          }
          break;
        }
        case 'ArrowUp':
          e.preventDefault();
          newRow = Math.max(0, row - 1);
          if (isShiftPressed) {
            // Extend selection
            if (!anchorCell) {
              // Start selection from current active cell
              setAnchorCell({ row, col });
            }
            ensureDimensions(newRow, col);
            setFocusCell({ row: newRow, col });
            setActiveCell({ row: newRow, col });
          } else {
            // Clear selection and move active cell
            navigateToCell(newRow, col, true);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          newRow = Math.min(rowCount - 1, row + 1);
          ensureDimensions(newRow, col);
          if (isShiftPressed) {
            // Extend selection
            if (!anchorCell) {
              setAnchorCell({ row, col });
            }
            setFocusCell({ row: newRow, col });
            setActiveCell({ row: newRow, col });
          } else {
            navigateToCell(newRow, col, true);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newCol = Math.max(0, col - 1);
          if (isShiftPressed) {
            // Extend selection
            if (!anchorCell) {
              setAnchorCell({ row, col });
            }
            setFocusCell({ row, col: newCol });
            setActiveCell({ row, col: newCol });
          } else {
            navigateToCell(row, newCol, true);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          newCol = Math.min(colCount - 1, col + 1);
          ensureDimensions(row, newCol);
          if (isShiftPressed) {
            // Extend selection
            if (!anchorCell) {
              setAnchorCell({ row, col });
            }
            setFocusCell({ row, col: newCol });
            setActiveCell({ row, col: newCol });
          } else {
            navigateToCell(row, newCol, true);
          }
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
        case 'Escape':
          e.preventDefault();
          setEditingCell(null);
          setEditValue('');
          break;
      }
    },
    [activeCell, isEditing, rowCount, colCount, navigateToCell, ensureDimensions, getCellValue, getEffectiveSelectionRange, setCellValue, enterEditMode]
  );

  // Track if mouse moved during selection (to distinguish click vs drag)
  const mouseDownRef = useRef<{ row: number; col: number; time: number } | null>(null);

  // Handle cell mouse down - start selection
  const handleCellMouseDown = useCallback(
    (e: React.MouseEvent, row: number, col: number) => {
      // Don't interfere with editing
      if (editingCell) return;

      e.preventDefault();

       // Ensure the grid container has focus so copy/paste events fire here
      if (gridRef.current) {
        gridRef.current.focus({ preventScroll: true });
      }

      const cell = { row, col };
      
      // Track mouse down position and time
      mouseDownRef.current = { row, col, time: Date.now() };
      
      // Set anchor and focus to clicked cell
      setAnchorCell(cell);
      setFocusCell(cell);
      setActiveCell(cell);
      setIsSelecting(true);
      
      // Ensure dimensions
      ensureDimensions(row, col);
    },
    [editingCell, ensureDimensions]
  );

  // Handle mouse move while selecting
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isSelecting || !gridRef.current) return;
      
      const container = gridRef.current;
      const rect = container.getBoundingClientRect();
      let scrollTop = container.scrollTop;
      let scrollLeft = container.scrollLeft;
      
      // Account for header height / row number width / column width
      const headerHeight = HEADER_HEIGHT;
      const rowNumberColumnWidth = ROW_NUMBER_WIDTH;
      const columnWidth = COLUMN_WIDTH;
      
      // Handle auto-scrolling when mouse is near edges
      const scrollThreshold = 50; // pixels from edge to trigger scroll
      const scrollSpeed = 10; // pixels to scroll per frame
      
      const mouseY = e.clientY - rect.top;
      const mouseX = e.clientX - rect.left;
      
      // Vertical scrolling
      if (mouseY < scrollThreshold && scrollTop > 0) {
        scrollTop = Math.max(0, scrollTop - scrollSpeed);
        container.scrollTop = scrollTop;
      } else if (mouseY > rect.height - scrollThreshold && scrollTop < container.scrollHeight - container.clientHeight) {
        scrollTop = Math.min(container.scrollHeight - container.clientHeight, scrollTop + scrollSpeed);
        container.scrollTop = scrollTop;
      }
      
      // Horizontal scrolling
      if (mouseX < scrollThreshold + rowNumberColumnWidth && scrollLeft > 0) {
        scrollLeft = Math.max(0, scrollLeft - scrollSpeed);
        container.scrollLeft = scrollLeft;
      } else if (mouseX > rect.width - scrollThreshold && scrollLeft < container.scrollWidth - container.clientWidth) {
        scrollLeft = Math.min(container.scrollWidth - container.clientWidth, scrollLeft + scrollSpeed);
        container.scrollLeft = scrollLeft;
      }
      
      // Recalculate after potential scrolling
      scrollTop = container.scrollTop;
      scrollLeft = container.scrollLeft;
      
      // Calculate mouse position relative to grid
      const mouseYRelative = mouseY + scrollTop - headerHeight;
      const mouseXRelative = mouseX + scrollLeft - rowNumberColumnWidth;
      
      // Calculate which cell the mouse is over
      const row = Math.max(0, Math.floor(mouseYRelative / ROW_HEIGHT));
      const col = Math.max(0, Math.floor(mouseXRelative / columnWidth));
      
      // Clamp to valid range
      const clampedRow = Math.min(row, rowCount - 1);
      const clampedCol = Math.min(col, colCount - 1);
      
      // Update focus cell
      const newFocusCell = { row: clampedRow, col: clampedCol };
      setFocusCell(newFocusCell);
      setActiveCell(newFocusCell);
      
      // Ensure dimensions
      ensureDimensions(clampedRow, clampedCol);
    },
    [isSelecting, rowCount, colCount, ensureDimensions]
  );

  // Handle mouse up - finalize selection
  const handleMouseUp = useCallback(() => {
    if (isSelecting) {
      setIsSelecting(false);
      
      // If mouse didn't move (or moved very little), treat as single click
      // This ensures 1x1 selection for single clicks
      if (mouseDownRef.current && anchorCell && focusCell) {
        const moved = 
          anchorCell.row !== focusCell.row || 
          anchorCell.col !== focusCell.col;
        
        // If no movement, ensure we have a 1x1 selection
        if (!moved) {
          setAnchorCell(anchorCell);
          setFocusCell(anchorCell);
        }
      }
      
      mouseDownRef.current = null;
    }
  }, [isSelecting, anchorCell, focusCell]);

  // Attach/detach mouse event listeners
  useEffect(() => {
    if (isSelecting) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isSelecting, handleMouseMove, handleMouseUp]);

  // Note: Single click handling is now done via mouseDown/mouseUp
  // This ensures proper selection behavior for both clicks and drags

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
      inputRef.current.focus({ preventScroll: true });
      const selection = pendingSelectionRef.current;
      if (selection) {
        const length = inputRef.current.value.length;
        const position =
          selection.position === 'end'
            ? length
            : selection.position === 'start'
              ? 0
              : Math.max(0, Math.min(length, selection.position));
        inputRef.current.setSelectionRange(position, position);
        pendingSelectionRef.current = null;
      } else {
        inputRef.current.select();
      }
    }
  }, [editingCell]);

  // Handle commit cell edit
  const handleCommitEdit = useCallback(() => {
    if (!editingCell) return;

    const { row, col } = parseCellKey(editingCell);
    const prevValue = getCellValue(row, col);
    const nextValue = editValue;

    // Record this edit as a single undoable action
    if (prevValue !== nextValue) {
      pushHistoryEntry({
        changes: [
          {
            row,
            col,
            prevValue,
            nextValue,
          },
        ],
      });
    }

    setCellValue(row, col, nextValue);
    setEditingCell(null);
    setEditValue('');
    setMode('navigation');
    setNavigationLocked(false);
  }, [editingCell, editValue, setCellValue, getCellValue, pushHistoryEntry]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
    setMode('navigation');
    setNavigationLocked(false);
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

        if (!navigationLocked && activeCell) {
          // Non-locked: keep existing behavior (move down)
          const nextRow = Math.min(rowCount - 1, activeCell.row + 1);
          ensureDimensions(nextRow, activeCell.col);
          navigateToCell(nextRow, activeCell.col);
        }
        // Ensure grid regains focus after leaving edit mode
        requestAnimationFrame(() => {
          gridRef.current?.focus({ preventScroll: true });
        });
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelEdit();
        requestAnimationFrame(() => {
          gridRef.current?.focus({ preventScroll: true });
        });
        return;
      }

      if (navigationLocked) {
        // Locked Edit Mode: arrows move caret, not cell selection
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const input = e.currentTarget;
          const length = input.value.length;
          const position = e.key === 'ArrowUp' ? 0 : length;
          input.setSelectionRange(position, position);
        }
        return;
      }

      // Non-locked Edit Mode: arrow keys exit edit and move selection
      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        e.preventDefault();
        handleCommitEdit();

        if (!activeCell) return;
        let nextRow = activeCell.row;
        let nextCol = activeCell.col;

        if (e.key === 'ArrowUp') nextRow = Math.max(0, activeCell.row - 1);
        if (e.key === 'ArrowDown') nextRow = Math.min(rowCount - 1, activeCell.row + 1);
        if (e.key === 'ArrowLeft') nextCol = Math.max(0, activeCell.col - 1);
        if (e.key === 'ArrowRight') nextCol = Math.min(colCount - 1, activeCell.col + 1);

        ensureDimensions(nextRow, nextCol);
        navigateToCell(nextRow, nextCol);
        requestAnimationFrame(() => {
          gridRef.current?.focus({ preventScroll: true });
        });
      }
    },
    [
      handleCommitEdit,
      handleCancelEdit,
      activeCell,
      rowCount,
      colCount,
      navigateToCell,
      ensureDimensions,
      navigationLocked,
    ]
  );

  /**
   * Handle batch copy via Ctrl/Cmd + C.
   *
   * We use the selection range if present; otherwise we fall back to
   * the single active cell. The copied content is written to the
   * clipboard as text/plain using TSV (tab-separated values):
   * - Columns are separated by '\t'
   * - Rows are separated by '\n'
   */
  const handleCopy = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      // If a cell editor is active, let the browser handle copy normally
      // so users can copy text inside the input.
      if (isEditing) {
        return;
      }

      const range = getEffectiveSelectionRange();
      if (!range) {
        return;
      }

      e.preventDefault();

      // Debug logging to verify copy handler is firing and what is selected
      console.log('[SpreadsheetGrid] onCopy fired', {
        activeElement: document.activeElement,
        range,
        activeCell,
      });

      const rows: string[] = [];
      for (let r = range.startRow; r <= range.endRow; r++) {
        const rowValues: string[] = [];
        for (let c = range.startCol; c <= range.endCol; c++) {
          const value = getCellValue(r, c);
          rowValues.push(value ?? '');
        }
        rows.push(rowValues.join('\t'));
      }

      const tsv = rows.join('\n');

      // Log the TSV content we are attempting to write
      console.log('[SpreadsheetGrid] onCopy TSV', tsv);

      try {
        e.clipboardData.setData('text/plain', tsv);
      } catch (err) {
        // Silently ignore clipboard write errors
        console.error('Failed to write to clipboard:', err);
      }
    },
    [isEditing, getEffectiveSelectionRange, getCellValue, activeCell]
  );

  /**
   * Handle batch paste via Ctrl/Cmd + V from Excel/Google Sheets.
   *
   * - Read `text/plain` from the clipboard.
   * - Parse as TSV into a 2D array.
   * - Determine paste start (selection start or active cell).
   * - Optimistically update local cell store and enqueue operations
   *   for the debounced batch saver.
   */
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      // If a cell editor is active, let the browser handle paste normally
      // so users can paste text inside the input.
      if (isEditing) {
        return;
      }

      const text = e.clipboardData.getData('text/plain');
      if (!text) {
        return;
      }

      const matrix = parseTSV(text);
      if (matrix.length === 0) {
        return;
      }

      const range = computeSelectionRange();
      const startRow =
        range?.startRow ?? activeCell?.row ?? 0;
      const startCol =
        range?.startCol ?? activeCell?.col ?? 0;

      e.preventDefault();

      // Debug logging to verify paste handler is firing and clipboard content
      console.log('[SpreadsheetGrid] onPaste fired', {
        activeElement: document.activeElement,
        range,
        activeCell,
        text,
      });

      // Compute maximum target row/column to ensure grid expansion
      let maxTargetRow = startRow;
      let maxTargetCol = startCol;
      const changes: CellChange[] = [];
      for (let r = 0; r < matrix.length; r++) {
        const row = matrix[r];
        for (let c = 0; c < row.length; c++) {
          const targetRow = startRow + r;
          const targetCol = startCol + c;
          if (targetRow > maxTargetRow) maxTargetRow = targetRow;
          if (targetCol > maxTargetCol) maxTargetCol = targetCol;

          const prevValue = getCellValue(targetRow, targetCol);
          const nextValue = row[c] ?? '';
          if (prevValue !== nextValue) {
            changes.push({
              row: targetRow,
              col: targetCol,
              prevValue,
              nextValue,
            });
          }
        }
      }

      // Expand grid if needed (debounced API call inside ensureDimensions)
      ensureDimensions(maxTargetRow, maxTargetCol);

      // Apply all values via the existing setCellValue helper, which:
      // - Updates local UI optimistically
      // - Enqueues a PendingOperation for the debounced batch saver
      for (let r = 0; r < matrix.length; r++) {
        const row = matrix[r];
        for (let c = 0; c < row.length; c++) {
          const value = row[c] ?? '';
          const targetRow = startRow + r;
          const targetCol = startCol + c;

          // Skip cells that would exceed hard maximum dimensions
          if (targetRow >= MAX_ROWS || targetCol >= MAX_COLUMNS) {
            continue;
          }

          setCellValue(targetRow, targetCol, value);
        }
      }

      // Group this paste as a single undoable action
      if (changes.length) {
        pushHistoryEntry({ changes });
      }
    },
    [isEditing, computeSelectionRange, activeCell, ensureDimensions, setCellValue, getCellValue, pushHistoryEntry]
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
  const editingCellCoords = editingCell ? parseCellKey(editingCell) : null;

  // Derived ranges for virtualized rendering
  const visibleStartRow = Math.max(0, visibleRange.startRow);
  const visibleEndRow = Math.min(rowCount - 1, visibleRange.endRow);
  const visibleStartCol = Math.max(0, visibleRange.startCol);
  const visibleEndCol = Math.min(colCount - 1, visibleRange.endCol);
  const visibleRowCount = Math.max(0, visibleEndRow - visibleStartRow + 1);
  const visibleColCount = Math.max(0, visibleEndCol - visibleStartCol + 1);

  const topSpacerHeight = visibleStartRow * ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, rowCount - visibleEndRow - 1) * ROW_HEIGHT;
  const leftSpacerWidth = visibleStartCol * COLUMN_WIDTH;
  const rightSpacerWidth = Math.max(0, colCount - visibleEndCol - 1) * COLUMN_WIDTH;

  const totalColumns =
    1 + // row number column
    1 + // left spacer
    visibleColCount +
    1; // right spacer

  // Debug logs to verify selection/edit coordinates vs visible range.
  useEffect(() => {
    if (!activeCell && !editingCell) return;
    console.log('[SpreadsheetGrid] state', {
      selectedCell: activeCell,
      editingCell: editingCellCoords,
      visibleStartRow,
      visibleStartCol,
    });
  }, [activeCell, editingCell, editingCellCoords, visibleStartRow, visibleStartCol]);

  // Debug log: which cell DOM actually contains the input
  useEffect(() => {
    if (!editingCell || !inputRef.current) return;
    requestAnimationFrame(() => {
      const td = inputRef.current?.closest('td') as HTMLTableCellElement | null;
      const row = td?.dataset?.row;
      const col = td?.dataset?.col;
      console.log('[SpreadsheetGrid] input mounted in cell', { row, col });
    });
  }, [editingCell]);

  const cellBaseStyle: React.CSSProperties = {
    height: `${ROW_HEIGHT}px`,
    minHeight: `${ROW_HEIGHT}px`,
    boxSizing: 'border-box',
  };

  const cellContentStyle: React.CSSProperties = {
    height: `${ROW_HEIGHT}px`,
    lineHeight: `${ROW_HEIGHT - CELL_PADDING_Y * 2}px`,
    padding: `${CELL_PADDING_Y}px ${CELL_PADDING_X}px`,
    boxSizing: 'border-box',
    fontSize: `${CELL_FONT_SIZE}px`,
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  };

  const cellInputStyle: React.CSSProperties = {
    height: `${ROW_HEIGHT}px`,
    lineHeight: `${ROW_HEIGHT - CELL_PADDING_Y * 2}px`,
    padding: `${CELL_PADDING_Y}px ${CELL_PADDING_X}px`,
    boxSizing: 'border-box',
    fontSize: `${CELL_FONT_SIZE}px`,
    border: 'none',
    outline: 'none',
  };

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
        onCopy={handleCopy}
        onPaste={handlePaste}
        tabIndex={0}
      >
        <table
          className="border-collapse"
          style={{
            tableLayout: 'fixed',
            width: `${ROW_NUMBER_WIDTH + colCount * COLUMN_WIDTH}px`,
          }}
        >
          <colgroup>
            <col style={{ width: `${ROW_NUMBER_WIDTH}px`, minWidth: `${ROW_NUMBER_WIDTH}px` }} />
            <col style={{ width: `${leftSpacerWidth}px`, minWidth: `${leftSpacerWidth}px` }} />
            {Array.from({ length: visibleColCount }).map((_, colIndex) => (
              <col
                key={colIndex}
                style={{ width: `${COLUMN_WIDTH}px`, minWidth: `${COLUMN_WIDTH}px` }}
              />
            ))}
            <col style={{ width: `${rightSpacerWidth}px`, minWidth: `${rightSpacerWidth}px` }} />
          </colgroup>

          {/* Column Headers */}
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th
                className="border border-gray-300 bg-gray-200 text-xs font-semibold text-gray-600 text-center sticky left-0 z-20"
                style={cellBaseStyle}
              >
                {/* Empty corner cell */}
              </th>
              <th
                className="border border-gray-300 bg-gray-200 p-0"
                style={{ width: `${leftSpacerWidth}px`, ...cellBaseStyle }}
              />
              {Array.from({ length: visibleColCount }).map((_, colOffset) => {
                const colIndex = visibleStartCol + colOffset;
                return (
                <th
                  key={colIndex}
                  className="border border-gray-300 bg-gray-200 text-xs font-semibold text-gray-600 text-center"
                  style={cellBaseStyle}
                >
                  {columnIndexToLabel(colIndex)}
                </th>
                );
              })}
              <th
                className="border border-gray-300 bg-gray-200 p-0"
                style={{ width: `${rightSpacerWidth}px`, ...cellBaseStyle }}
              />
            </tr>
          </thead>

          {/* Grid Body */}
          <tbody>
            {topSpacerHeight > 0 && (
              <tr>
                <td
                  colSpan={totalColumns}
                  style={{ height: `${topSpacerHeight}px` }}
                />
              </tr>
            )}

            {Array.from({ length: visibleRowCount }).map((_, rowOffset) => {
              const row = visibleStartRow + rowOffset; // 0-based for API
              return (
                <tr key={row}>
                  {/* Row Number */}
                  <td
                    className="border border-gray-300 bg-gray-100 text-xs font-semibold text-gray-600 text-center sticky left-0 z-10"
                    style={cellBaseStyle}
                  >
                    {row + 1}
                  </td>

                  {/* Left spacer */}
                  <td
                    className="border border-gray-300 p-0"
                    style={{ width: `${leftSpacerWidth}px`, ...cellBaseStyle }}
                  />

                  {/* Data Cells */}
                  {Array.from({ length: visibleColCount }).map((_, colOffset) => {
                    const col = visibleStartCol + colOffset; // 0-based for API
                    const key = getCellKey(row, col);
                    const isActive = activeCell && activeCell.row === row && activeCell.col === col;
                    const isInSelection = isCellInSelection(row, col);
                    const isEditing = editingCell === key;
                    const displayValue = isEditing ? editValue : getCellValue(row, col);
                    
                    // Determine cell styling based on selection state
                    let cellClassName = 'border border-gray-300 p-0 relative align-top';
                    if (isEditing) {
                      cellClassName += ' ring-2 ring-blue-600 ring-inset';
                    } else if (isActive && isInSelection) {
                      // Active cell within selection: thicker border
                      cellClassName += ' ring-2 ring-blue-500 ring-inset bg-blue-50';
                    } else if (isActive) {
                      // Active cell without selection
                      cellClassName += ' ring-2 ring-blue-500 ring-inset';
                    } else if (isInSelection) {
                      // Cell in selection range (but not active)
                      cellClassName += ' bg-blue-100';
                    }

                    return (
                      <td
                        key={`${row}-${col}`}
                        className={cellClassName}
                        onMouseDown={(e) => handleCellMouseDown(e, row, col)}
                        onDoubleClick={() => handleCellDoubleClick(row, col)}
                        style={{ minWidth: `${COLUMN_WIDTH}px`, ...cellBaseStyle }}
                        data-row={row}
                        data-col={col}
                      >
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleInputBlur}
                            // Stop propagation so grid-level handlers never see
                            // key events while editing. The input's own handler
                            // (handleInputKeyDown) takes care of Enter/Escape.
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              handleInputKeyDown(e);
                            }}
                            className="w-full"
                            style={{ minWidth: `${COLUMN_WIDTH}px`, ...cellInputStyle }}
                          />
                        ) : (
                          <div className="text-gray-900" style={cellContentStyle}>
                            {displayValue}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Right spacer */}
                  <td
                    className="border border-gray-300 p-0"
                    style={{ width: `${rightSpacerWidth}px`, ...cellBaseStyle }}
                  />
                </tr>
              );
            })}

            {bottomSpacerHeight > 0 && (
              <tr>
                <td
                  colSpan={totalColumns}
                  style={{ height: `${bottomSpacerHeight}px` }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
