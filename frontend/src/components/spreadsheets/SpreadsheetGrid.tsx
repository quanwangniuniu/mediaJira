'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { SpreadsheetAPI } from '@/lib/api/spreadsheetApi';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import {
  parseCSVFile,
  parseXLSXFile,
  buildCellOperations,
  chunkOperations,
  exportMatrixToCSV,
  exportMatrixToXLSX,
  CellOperation,
  XLSXParseResult,
} from '@/components/spreadsheets/spreadsheetImportExport';
import { adjustFormulaReferences, colLabelToIndex } from '@/lib/spreadsheet/formulaFill';

interface SpreadsheetGridProps {
  spreadsheetId: number;
  sheetId: number;
  spreadsheetName?: string;
  sheetName?: string;
}

type CellKey = string; // Format: `${row}:${col}` (0-based indices)

interface CellData {
  rawInput: string;
  computedType?: string | null;
  computedNumber?: number | string | null;
  computedString?: string | null;
  errorCode?: string | null;
  isLoaded: boolean; // Track if cell was loaded from backend
}

interface PendingOperation {
  row: number;
  column: number;
  operation: 'set' | 'clear';
  raw_input?: string | null;
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

interface ResizeState {
  type: 'col' | 'row';
  index: number;
  startPosition: number;
  startSize: number;
  pointerId: number;
}

interface SizeIndex {
  indices: number[];
  prefix: number[];
  totalDelta: number;
}

const DEFAULT_ROWS = 200;
const DEFAULT_COLUMNS = 52; // A-Z + AA-AZ
const ROW_HEIGHT = 24; // pixels
const COLUMN_WIDTH = 120; // pixels
const ROW_MIN_HEIGHT = 20; // pixels
const COLUMN_MIN_WIDTH = 40; // pixels
const ROW_NUMBER_WIDTH = 50; // pixels
const HEADER_HEIGHT = 24; // pixels
const RESIZE_HANDLE_SIZE = 6; // pixels
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

const buildSizeIndex = (sizes: Record<number, number>, defaultSize: number): SizeIndex => {
  const entries = Object.entries(sizes)
    .map(([key, value]) => ({ index: Number(key), delta: value - defaultSize }))
    .filter((entry) => Number.isFinite(entry.index) && entry.delta !== 0)
    .sort((a, b) => a.index - b.index);

  const indices: number[] = [];
  const prefix: number[] = [];
  let totalDelta = 0;

  for (const entry of entries) {
    totalDelta += entry.delta;
    indices.push(entry.index);
    prefix.push(totalDelta);
  }

  return { indices, prefix, totalDelta };
};

const getDeltaBefore = (index: number, sizeIndex: SizeIndex): number => {
  const { indices, prefix } = sizeIndex;
  let low = 0;
  let high = indices.length - 1;
  let position = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (indices[mid] < index) {
      position = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return position >= 0 ? prefix[position] : 0;
};

const findIndexAtOffset = (
  offset: number,
  count: number,
  getOffset: (index: number) => number,
  getSize: (index: number) => number
): number => {
  if (count <= 0) return 0;
  const clampedOffset = Math.max(0, offset);
  let low = 0;
  let high = count - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const start = getOffset(mid);
    const end = start + getSize(mid);

    if (clampedOffset < start) {
      high = mid - 1;
    } else if (clampedOffset >= end) {
      low = mid + 1;
    } else {
      return mid;
    }
  }

  return Math.max(0, Math.min(count - 1, low));
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

export default function SpreadsheetGrid({
  spreadsheetId,
  sheetId,
  spreadsheetName,
  sheetName,
}: SpreadsheetGridProps) {
  const [rowCount, setRowCount] = useState(DEFAULT_ROWS);
  const [colCount, setColCount] = useState(DEFAULT_COLUMNS);
  const [colWidths, setColWidths] = useState<Record<number, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
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
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [xlsxImport, setXlsxImport] = useState<XLSXParseResult | null>(null);
  const [selectedXlsxSheet, setSelectedXlsxSheet] = useState<string>('');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [formulaBarValue, setFormulaBarValue] = useState<string>('');
  const [isFormulaBarEditing, setIsFormulaBarEditing] = useState(false);
  const [formulaBarTarget, setFormulaBarTarget] = useState<CellKey | null>(null);
  const [isFilling, setIsFilling] = useState(false);
  const [fillPreview, setFillPreview] = useState<{ direction: 'horizontal' | 'vertical' | null; count: number } | null>(
    null
  );
  const [isFillSubmitting, setIsFillSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resizeDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSelectionRef = useRef<{ position: 'start' | 'end' | number } | null>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const fillStateRef = useRef<{
    startRow: number;
    startCol: number;
    startX: number;
    startY: number;
    direction: 'horizontal' | 'vertical' | null;
    pointerId: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const exportTriggerRef = useRef<HTMLButtonElement>(null);

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
    setColWidths({});
    setRowHeights({});
    setIsResizing(false);
    resizeStateRef.current = null;
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

  const applyCellValueLocal = useCallback(
    (row: number, col: number, value: string) => {
      const key = getCellKey(row, col);
      const cellData: CellData = {
        rawInput: value,
        computedType: null,
        computedNumber: null,
        computedString: null,
        errorCode: null,
        isLoaded: true,
      };

      setCells((prev) => {
        const next = new Map(prev);
        next.set(key, cellData);

        const cachedCells = cellCache.get(sheetId) || new Map();
        cachedCells.set(key, cellData);
        cellCache.set(sheetId, cachedCells);

        return next;
      });
    },
    [sheetId]
  );

  // True when a cell editor is mounted and active.
  // In this mode, we must NOT handle grid-level keyboard shortcuts so that
  // native text editing (typing, Backspace/Delete, Ctrl/Cmd+Z, etc.) works.
  const isEditing = mode === 'edit';

  const rowSizeIndex = useMemo(() => buildSizeIndex(rowHeights, ROW_HEIGHT), [rowHeights]);
  const colSizeIndex = useMemo(() => buildSizeIndex(colWidths, COLUMN_WIDTH), [colWidths]);

  const getRowHeight = useCallback((row: number) => rowHeights[row] ?? ROW_HEIGHT, [rowHeights]);
  const getColumnWidth = useCallback((col: number) => colWidths[col] ?? COLUMN_WIDTH, [colWidths]);

  const getRowOffset = useCallback(
    (rowIndex: number) => {
      const clamped = Math.max(0, Math.min(rowIndex, rowCount));
      return clamped * ROW_HEIGHT + getDeltaBefore(clamped, rowSizeIndex);
    },
    [rowCount, rowSizeIndex]
  );

  const getColumnOffset = useCallback(
    (colIndex: number) => {
      const clamped = Math.max(0, Math.min(colIndex, colCount));
      return clamped * COLUMN_WIDTH + getDeltaBefore(clamped, colSizeIndex);
    },
    [colCount, colSizeIndex]
  );

  const getRowIndexAtOffset = useCallback(
    (offset: number) => findIndexAtOffset(offset, rowCount, getRowOffset, getRowHeight),
    [rowCount, getRowOffset, getRowHeight]
  );

  const getColumnIndexAtOffset = useCallback(
    (offset: number) => findIndexAtOffset(offset, colCount, getColumnOffset, getColumnWidth),
    [colCount, getColumnOffset, getColumnWidth]
  );

  const totalRowHeight = useMemo(
    () => rowCount * ROW_HEIGHT + rowSizeIndex.totalDelta,
    [rowCount, rowSizeIndex]
  );

  const totalColumnWidth = useMemo(
    () => colCount * COLUMN_WIDTH + colSizeIndex.totalDelta,
    [colCount, colSizeIndex]
  );

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

  const isSingleCellSelection = useMemo(() => {
    if (!activeCell || !anchorCell || !focusCell) return false;
    return (
      activeCell.row === anchorCell.row &&
      activeCell.col === anchorCell.col &&
      anchorCell.row === focusCell.row &&
      anchorCell.col === focusCell.col
    );
  }, [activeCell, anchorCell, focusCell]);

  const isCellInFillPreview = useCallback(
    (row: number, col: number): boolean => {
      if (!isFilling || !fillPreview || !activeCell) return false;
      if (!fillPreview.direction || fillPreview.count === 0) return false;
      if (fillPreview.direction === 'vertical') {
        const start = activeCell.row + Math.min(0, fillPreview.count);
        const end = activeCell.row + Math.max(0, fillPreview.count);
        return col === activeCell.col && row >= start && row <= end && row !== activeCell.row;
      }
      const start = activeCell.col + Math.min(0, fillPreview.count);
      const end = activeCell.col + Math.max(0, fillPreview.count);
      return row === activeCell.row && col >= start && col <= end && col !== activeCell.col;
    },
    [activeCell, fillPreview, isFilling]
  );

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

    const startRow = Math.max(
      0,
      getRowIndexAtOffset(adjustedScrollTop) - OVERSCAN_ROWS
    );
    const endRow = Math.min(
      rowCount - 1,
      getRowIndexAtOffset(adjustedScrollTop + containerHeight) + OVERSCAN_ROWS
    );

    // Account for row number column width for horizontal range
    const dataViewportWidth = Math.max(0, containerWidth - ROW_NUMBER_WIDTH);
    const startColumn = Math.max(0, getColumnIndexAtOffset(scrollLeft) - OVERSCAN_COLUMNS);
    const endColumn = Math.min(
      colCount - 1,
      getColumnIndexAtOffset(scrollLeft + dataViewportWidth) + OVERSCAN_COLUMNS
    );

    return { startRow, endRow, startColumn, endColumn };
  }, [rowCount, colCount, getRowIndexAtOffset, getColumnIndexAtOffset]);

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
    async (
      startRow: number,
      endRow: number,
      startColumn: number,
      endColumn: number,
      force: boolean = false
    ) => {
      if (!force && isRangeLoaded(startRow, endRow, startColumn, endColumn)) {
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
            const fallbackRawInput =
              cell.raw_input ??
              cell.formula_value ??
              cell.string_value ??
              (cell.number_value != null ? String(cell.number_value) : '') ??
              (cell.boolean_value != null ? (cell.boolean_value ? 'TRUE' : 'FALSE') : '');
            const cellData: CellData = {
              rawInput: fallbackRawInput,
              computedType: cell.computed_type ?? null,
              computedNumber: cell.computed_number ?? null,
              computedString: cell.computed_string ?? null,
              errorCode: cell.error_code ?? null,
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

  const applyCellsFromResponse = useCallback(
    (cellsResponse?: Array<{
      row_position: number;
      column_position: number;
      raw_input?: string | null;
      string_value?: string | null;
      number_value?: number | null;
      boolean_value?: boolean | null;
      formula_value?: string | null;
      computed_type?: string | null;
      computed_number?: number | string | null;
      computed_string?: string | null;
      error_code?: string | null;
    }>) => {
      if (!cellsResponse || cellsResponse.length === 0) return;
      setCells((prev) => {
        const next = new Map(prev);
        const cachedCells = cellCache.get(sheetId) || new Map();

        cellsResponse.forEach((cell) => {
          const key = getCellKey(cell.row_position, cell.column_position);
          const fallbackRawInput =
            cell.raw_input ??
            cell.formula_value ??
            cell.string_value ??
            (cell.number_value != null ? String(cell.number_value) : '') ??
            (cell.boolean_value != null ? (cell.boolean_value ? 'TRUE' : 'FALSE') : '');
          const cellData: CellData = {
            rawInput: fallbackRawInput,
            computedType: cell.computed_type ?? null,
            computedNumber: cell.computed_number ?? null,
            computedString: cell.computed_string ?? null,
            errorCode: cell.error_code ?? null,
            isLoaded: true,
          };
          next.set(key, cellData);
          cachedCells.set(key, cellData);
        });

        cellCache.set(sheetId, cachedCells);
        return next;
      });
    },
    [sheetId]
  );

  const submitFormulaBarValue = useCallback(
    async (targetKey: CellKey | null, value: string) => {
      if (!targetKey) return;
      const { row, col } = parseCellKey(targetKey);
      setIsSaving(true);
      setSaveError(null);
      try {
        const response = await SpreadsheetAPI.batchUpdateCells(
          spreadsheetId,
          sheetId,
          [
            {
              operation: value.trim() === '' ? 'clear' : 'set',
              row,
              column: col,
              raw_input: value,
            },
          ],
          true
        );
        applyCellsFromResponse(response.cells);
        setPendingOps((prev) => {
          const next = new Map(prev);
          next.delete(targetKey);
          return next;
        });
        if (!response.cells || response.cells.length === 0) {
          await loadCellRange(row, row, col, col, true);
        }
      } catch (error: any) {
        console.error('Failed to save formula bar edit:', error);
        const errorMessage =
          error?.response?.data?.error ||
          error?.response?.data?.detail ||
          error?.message ||
          'Failed to save formula';
        setSaveError(errorMessage);
        toast.error(errorMessage, { duration: 3000 });
      } finally {
        setIsSaving(false);
      }
    },
    [applyCellsFromResponse, loadCellRange, sheetId, spreadsheetId]
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
    let minRow = Number.POSITIVE_INFINITY;
    let maxRow = Number.NEGATIVE_INFINITY;
    let minCol = Number.POSITIVE_INFINITY;
    let maxCol = Number.NEGATIVE_INFINITY;

    operations.forEach((op) => {
      minRow = Math.min(minRow, op.row);
      maxRow = Math.max(maxRow, op.row);
      minCol = Math.min(minCol, op.column);
      maxCol = Math.max(maxCol, op.column);
    });

    try {
      const response = await SpreadsheetAPI.batchUpdateCells(spreadsheetId, sheetId, operations, true);
      setPendingOps(new Map()); // Clear queue on success
      applyCellsFromResponse(response.cells);
      if (Number.isFinite(minRow)) {
        await loadCellRange(minRow, maxRow, minCol, maxCol, true);
      }
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
  }, [pendingOps, spreadsheetId, sheetId, isSaving, loadCellRange, applyCellsFromResponse]);

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

  const getCellRawInput = useCallback(
    (row: number, col: number): string => {
      const key = getCellKey(row, col);
      const cellData = cells.get(key);
      return cellData?.rawInput ?? '';
    },
    [cells]
  );

  const getCellNumericValue = useCallback(
    (row: number, col: number): number | null => {
      const key = getCellKey(row, col);
      const cellData = cells.get(key);
      if (!cellData) return 0;
      const rawInput = cellData.rawInput ?? '';
      if (rawInput.trim() === '') return 0;
      if (cellData.computedType === 'number' && cellData.computedNumber != null) {
        return Number(cellData.computedNumber);
      }
      if (!rawInput.startsWith('=')) {
        const parsed = Number(rawInput);
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return 0;
    },
    [cells]
  );

  const evaluateFormulaLocally = useCallback(
    (formula: string): number | null => {
      if (!formula.startsWith('=')) return null;
      const expr = formula.slice(1);
      const tokens: Array<{ type: 'number' | 'op' | 'ref' | 'lparen' | 'rparen'; value: string }> = [];
      let idx = 0;
      while (idx < expr.length) {
        const char = expr[idx];
        if (char === ' ' || char === '\t') {
          idx += 1;
          continue;
        }
        if ('+-*/()'.includes(char)) {
          tokens.push({
            type: char === '(' ? 'lparen' : char === ')' ? 'rparen' : 'op',
            value: char,
          });
          idx += 1;
          continue;
        }
        if ((char >= '0' && char <= '9') || char === '.') {
          let start = idx;
          idx += 1;
          while (idx < expr.length && /[0-9.]/.test(expr[idx])) idx += 1;
          tokens.push({ type: 'number', value: expr.slice(start, idx) });
          continue;
        }
        if (/[A-Za-z]/.test(char)) {
          let start = idx;
          idx += 1;
          while (idx < expr.length && /[A-Za-z]/.test(expr[idx])) idx += 1;
          const colLabel = expr.slice(start, idx).toUpperCase();
          let rowStart = idx;
          while (idx < expr.length && /[0-9]/.test(expr[idx])) idx += 1;
          const rowLabel = expr.slice(rowStart, idx);
          if (rowLabel) {
            tokens.push({ type: 'ref', value: `${colLabel}${rowLabel}` });
            continue;
          }
          return null;
        }
        return null;
      }

      let cursor = 0;
      const peek = () => tokens[cursor];
      const consume = () => tokens[cursor++];

      const parseExpression = (): number | null => {
        let value = parseTerm();
        while (value !== null && peek() && peek().type === 'op' && '+-'.includes(peek().value)) {
          const op = consume().value;
          const right = parseTerm();
          if (right === null) return null;
          value = op === '+' ? value + right : value - right;
        }
        return value;
      };

      const parseTerm = (): number | null => {
        let value = parseFactor();
        while (value !== null && peek() && peek().type === 'op' && '*/'.includes(peek().value)) {
          const op = consume().value;
          const right = parseFactor();
          if (right === null) return null;
          if (op === '*') {
            value = value * right;
          } else {
            if (right === 0) return null;
            value = value / right;
          }
        }
        return value;
      };

      const parseFactor = (): number | null => {
        const token = peek();
        if (!token) return null;
        if (token.type === 'op' && '+-'.includes(token.value)) {
          const op = consume().value;
          const next = parseFactor();
          if (next === null) return null;
          return op === '+' ? next : -next;
        }
        if (token.type === 'number') {
          consume();
          const parsed = Number(token.value);
          return Number.isFinite(parsed) ? parsed : null;
        }
        if (token.type === 'ref') {
          consume();
          const match = token.value.match(/^([A-Z]+)(\d+)$/);
          if (!match) return null;
          const colIndex = colLabelToIndex(match[1]);
          const rowIndex = Number(match[2]) - 1;
          if (rowIndex < 0 || colIndex < 0) return null;
          return getCellNumericValue(rowIndex, colIndex);
        }
        if (token.type === 'lparen') {
          consume();
          const inner = parseExpression();
          if (!peek() || peek().type !== 'rparen') return null;
          consume();
          return inner;
        }
        return null;
      };

      const result = parseExpression();
      if (result === null || peek()) return null;
      return Number.isFinite(result) ? result : null;
    },
    [getCellNumericValue]
  );

  const formatComputedNumber = useCallback((value: number | string): string => {
    const rawValue = String(value);
    if (rawValue.includes('e') || rawValue.includes('E')) {
      return rawValue;
    }
    const parts = rawValue.split('.');
    if (parts.length === 1) {
      return rawValue;
    }
    const [integerPart, fractionalPart] = parts;
    const limitedFraction = fractionalPart.slice(0, 10);
    const limited = `${integerPart}.${limitedFraction}`;
    return limited.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }, []);

  const getCellDisplayValue = useCallback(
    (row: number, col: number): string => {
      const key = getCellKey(row, col);
      const cellData = cells.get(key);
      if (!cellData) return '';
      const rawInput = cellData.rawInput || '';
      if (!rawInput.startsWith('=')) {
        const trimmed = rawInput.trim();
        if (/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(trimmed)) {
          return formatComputedNumber(trimmed);
        }
        return rawInput;
      }
      if (cellData.errorCode) {
        if (cellData.errorCode === '#VALUE!') {
          const localValue = evaluateFormulaLocally(rawInput);
          if (localValue != null) {
            return formatComputedNumber(localValue);
          }
        }
        return cellData.errorCode;
      }
      if (cellData.computedType === 'number' && cellData.computedNumber != null) {
        return formatComputedNumber(cellData.computedNumber);
      }
      if (cellData.computedType === 'boolean') {
        if (cellData.computedString != null) {
          return cellData.computedString;
        }
        return '';
      }
      if (cellData.computedType === 'string' && cellData.computedString != null) {
        return cellData.computedString;
      }
      if (cellData.computedType == null || cellData.computedNumber == null) {
        const localValue = evaluateFormulaLocally(rawInput);
        if (localValue != null) {
          return formatComputedNumber(localValue);
        }
      }
      if (cellData.computedType === 'empty') return '';
      return '';
    },
    [cells, evaluateFormulaLocally, formatComputedNumber]
  );

  const getFormulaBarDisplayValue = useCallback((): string => {
    if (!activeCell) return '';
    const rawInput = getCellRawInput(activeCell.row, activeCell.col);
    if (rawInput) return rawInput;
    return getCellDisplayValue(activeCell.row, activeCell.col);
  }, [activeCell, getCellDisplayValue, getCellRawInput]);

  useEffect(() => {
    if (isFormulaBarEditing) return;
    if (!activeCell) {
      setFormulaBarValue('');
      setFormulaBarTarget(null);
      return;
    }
    const key = getCellKey(activeCell.row, activeCell.col);
    setFormulaBarTarget(key);
    setFormulaBarValue(getFormulaBarDisplayValue());
  }, [activeCell, getFormulaBarDisplayValue, isFormulaBarEditing]);

  const getUsedRangeFromCells = useCallback((): SelectionRange | null => {
    let minRow = Number.POSITIVE_INFINITY;
    let maxRow = Number.NEGATIVE_INFINITY;
    let minCol = Number.POSITIVE_INFINITY;
    let maxCol = Number.NEGATIVE_INFINITY;

    cells.forEach((cell, key) => {
      if (!cell.rawInput) return;
      const { row, col } = parseCellKey(key);
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    });

    if (!Number.isFinite(minRow)) {
      return null;
    }

    return {
      startRow: minRow,
      endRow: maxRow,
      startCol: minCol,
      endCol: maxCol,
    };
  }, [cells]);

  const buildMatrixFromRange = useCallback(
    (range: SelectionRange): string[][] => {
      const matrix: string[][] = [];
      for (let r = range.startRow; r <= range.endRow; r += 1) {
        const row: string[] = [];
        for (let c = range.startCol; c <= range.endCol; c += 1) {
          row.push(getCellDisplayValue(r, c));
        }
        matrix.push(row);
      }
      return matrix;
    },
    [getCellDisplayValue]
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
          rawInput: trimmedValue,
          computedType: null,
          computedNumber: null,
          computedString: null,
          errorCode: null,
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
          ...(trimmedValue !== '' && { raw_input: trimmedValue }),
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
        const dataViewportHeight = Math.max(0, container.clientHeight - HEADER_HEIGHT);
        const dataViewportWidth = Math.max(0, container.clientWidth - ROW_NUMBER_WIDTH);
        const dataScrollTop = Math.max(0, container.scrollTop - HEADER_HEIGHT);
        const dataScrollLeft = container.scrollLeft;

        const cellTop = getRowOffset(clampedRow);
        const cellBottom = cellTop + getRowHeight(clampedRow);
        const cellLeft = getColumnOffset(clampedCol);
        const cellRight = cellLeft + getColumnWidth(clampedCol);

        if (cellTop < dataScrollTop) {
          container.scrollTop = cellTop + HEADER_HEIGHT;
        } else if (cellBottom > dataScrollTop + dataViewportHeight) {
          container.scrollTop = cellBottom - dataViewportHeight + HEADER_HEIGHT;
        }

        if (cellLeft < dataScrollLeft) {
          container.scrollLeft = cellLeft;
        } else if (cellRight > dataScrollLeft + dataViewportWidth) {
          container.scrollLeft = cellRight - dataViewportWidth;
        }
      }
    },
    [rowCount, colCount, ensureDimensions, getRowOffset, getRowHeight, getColumnOffset, getColumnWidth]
  );

  // Handle keyboard navigation (Navigation Mode only)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (isImporting) {
        return;
      }

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
        const value = getCellRawInput(targetCell.row, targetCell.col);
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
              const prevValue = getCellRawInput(r, c);
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
    [activeCell, isEditing, rowCount, colCount, navigateToCell, ensureDimensions, getCellRawInput, getEffectiveSelectionRange, setCellValue, enterEditMode]
  );

  // Track if mouse moved during selection (to distinguish click vs drag)
  const mouseDownRef = useRef<{ row: number; col: number; time: number } | null>(null);

  const startResize = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, type: ResizeState['type'], index: number) => {
      if (editingCell || isImporting) return;
      e.preventDefault();
      e.stopPropagation();

      const startSize = type === 'col' ? getColumnWidth(index) : getRowHeight(index);
      resizeStateRef.current = {
        type,
        index,
        startPosition: type === 'col' ? e.clientX : e.clientY,
        startSize,
        pointerId: e.pointerId,
      };
      setIsResizing(true);
      setIsSelecting(false);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [editingCell, isImporting, getColumnWidth, getRowHeight]
  );

  const handleResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const state = resizeStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    e.preventDefault();

    if (state.type === 'col') {
      const delta = e.clientX - state.startPosition;
      const nextWidth = Math.max(COLUMN_MIN_WIDTH, state.startSize + delta);
      setColWidths((prev) => {
        if (prev[state.index] === nextWidth) return prev;
        return { ...prev, [state.index]: nextWidth };
      });
    } else {
      const delta = e.clientY - state.startPosition;
      const nextHeight = Math.max(ROW_MIN_HEIGHT, state.startSize + delta);
      setRowHeights((prev) => {
        if (prev[state.index] === nextHeight) return prev;
        return { ...prev, [state.index]: nextHeight };
      });
    }
  }, []);

  const handleResizePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const state = resizeStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    resizeStateRef.current = null;
    setIsResizing(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const getCellIndexFromPointer = useCallback(
    (clientX: number, clientY: number): { row: number; col: number } | null => {
      if (!gridRef.current) return null;
      const rect = gridRef.current.getBoundingClientRect();
      const offsetX = clientX - rect.left + gridRef.current.scrollLeft - ROW_NUMBER_WIDTH;
      const offsetY = clientY - rect.top + gridRef.current.scrollTop - HEADER_HEIGHT;
      if (offsetX < 0 || offsetY < 0) return null;
      const col = getColumnIndexAtOffset(offsetX);
      const row = getRowIndexAtOffset(offsetY);
      return { row, col };
    },
    [getColumnIndexAtOffset, getRowIndexAtOffset]
  );

  const handleFillPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!fillStateRef.current || !isFilling) return;
      const state = fillStateRef.current;
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      const nextDirection = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
      const targetCell = getCellIndexFromPointer(e.clientX, e.clientY);
      if (!targetCell) {
        setFillPreview({ direction: nextDirection, count: 0 });
        return;
      }
      let count = 0;
      if (nextDirection === 'horizontal') {
        count = targetCell.col - state.startCol;
      } else {
        count = targetCell.row - state.startRow;
      }
      fillStateRef.current = { ...state, direction: nextDirection };
      setFillPreview({ direction: nextDirection, count });
    },
    [getCellIndexFromPointer, isFilling]
  );

  const handleFillPointerUp = useCallback(async () => {
    if (!fillStateRef.current) return;
    const state = fillStateRef.current;
    fillStateRef.current = null;
    setIsFilling(false);

    if (!fillPreview || !fillPreview.direction || fillPreview.count === 0) {
      setFillPreview(null);
      return;
    }
    if (isFillSubmitting) return;

    const sourceRow = state.startRow;
    const sourceCol = state.startCol;
    const sourceRawInput = getCellRawInput(sourceRow, sourceCol);
    const operations: Array<{
      operation: 'set' | 'clear';
      row: number;
      column: number;
      raw_input: string;
    }> = [];
    const step = fillPreview.count > 0 ? 1 : -1;
    for (let i = step; Math.abs(i) <= Math.abs(fillPreview.count); i += step) {
      const targetRow = fillPreview.direction === 'vertical' ? sourceRow + i : sourceRow;
      const targetCol = fillPreview.direction === 'horizontal' ? sourceCol + i : sourceCol;
      if (targetRow < 0 || targetCol < 0) {
        continue;
      }
      const rowDelta = targetRow - sourceRow;
      const colDelta = targetCol - sourceCol;
      const nextRawInput = sourceRawInput.startsWith('=')
        ? adjustFormulaReferences(sourceRawInput, rowDelta, colDelta)
        : sourceRawInput;
      operations.push({
        operation: nextRawInput.trim() === '' ? 'clear' : 'set',
        row: targetRow,
        column: targetCol,
        raw_input: nextRawInput,
      });
    }

    if (!operations.length) {
      setFillPreview(null);
      return;
    }

    setIsFillSubmitting(true);
    try {
      const response = await SpreadsheetAPI.batchUpdateCells(
        spreadsheetId,
        sheetId,
        operations,
        true
      );
      applyCellsFromResponse(response.cells);
    } catch (error: any) {
      console.error('Failed to fill cells:', error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        'Failed to fill cells';
      toast.error(errorMessage, { duration: 3000 });
    } finally {
      setFillPreview(null);
      setIsFillSubmitting(false);
    }
  }, [applyCellsFromResponse, fillPreview, getCellRawInput, isFillSubmitting, sheetId, spreadsheetId]);

  useEffect(() => {
    if (!isFilling) return;
    const onMove = (event: PointerEvent) => handleFillPointerMove(event);
    const onUp = () => handleFillPointerUp();
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp, { once: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [handleFillPointerMove, handleFillPointerUp, isFilling]);

  // Handle cell mouse down - start selection
  const handleCellMouseDown = useCallback(
    (e: React.MouseEvent, row: number, col: number) => {
      // Don't interfere with editing
      if (editingCell || isImporting || isResizing || resizeStateRef.current) return;

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
    [editingCell, isImporting, isResizing, ensureDimensions]
  );

  const handleFillHandlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, row: number, col: number) => {
      if (isFillSubmitting || isImporting || editingCell) return;
      e.stopPropagation();
      e.preventDefault();
      setIsFilling(true);
      setFillPreview({ direction: null, count: 0 });
      fillStateRef.current = {
        startRow: row,
        startCol: col,
        startX: e.clientX,
        startY: e.clientY,
        direction: null,
        pointerId: e.pointerId,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [editingCell, isFillSubmitting, isImporting]
  );

  // Handle mouse move while selecting
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isSelecting || !gridRef.current || isResizing || resizeStateRef.current) return;
      
      const container = gridRef.current;
      const rect = container.getBoundingClientRect();
      let scrollTop = container.scrollTop;
      let scrollLeft = container.scrollLeft;
      
      // Account for header height / row number width
      const headerHeight = HEADER_HEIGHT;
      const rowNumberColumnWidth = ROW_NUMBER_WIDTH;
      
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
      const row = getRowIndexAtOffset(mouseYRelative);
      const col = getColumnIndexAtOffset(mouseXRelative);
      
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
    [isSelecting, rowCount, colCount, ensureDimensions, isResizing, getRowIndexAtOffset, getColumnIndexAtOffset]
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

  const handleSelectAll = useCallback(() => {
    if (isImporting) return;
    const lastRow = Math.max(0, rowCount - 1);
    const lastCol = Math.max(0, colCount - 1);

    if (gridRef.current) {
      gridRef.current.focus({ preventScroll: true });
    }

    setIsSelecting(false);
    setEditingCell(null);
    setEditValue('');
    setMode('navigation');
    setNavigationLocked(false);

    const start = { row: 0, col: 0 };
    setActiveCell(start);
    setAnchorCell(start);
    setFocusCell({ row: lastRow, col: lastCol });
  }, [isImporting, rowCount, colCount]);

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
      if (isImporting) return;
      const value = getCellRawInput(row, col);
      // Match Enter behavior: edit mode with navigation locked.
      enterEditMode({ row, col }, value, true, 'end');
    },
    [enterEditMode, getCellRawInput, isImporting]
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
    const prevValue = getCellRawInput(row, col);
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
  }, [editingCell, editValue, setCellValue, getCellRawInput, pushHistoryEntry]);

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

  const handleFormulaBarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isFormulaBarEditing) {
        setIsFormulaBarEditing(true);
      }
      if (!formulaBarTarget && activeCell) {
        setFormulaBarTarget(getCellKey(activeCell.row, activeCell.col));
      }
      setFormulaBarValue(e.target.value);
    },
    [activeCell, formulaBarTarget, isFormulaBarEditing]
  );

  const handleFormulaBarCommit = useCallback(async () => {
    const targetKey =
      formulaBarTarget ?? (activeCell ? getCellKey(activeCell.row, activeCell.col) : null);
    await submitFormulaBarValue(targetKey, formulaBarValue);
    setIsFormulaBarEditing(false);
    if (targetKey) {
      setFormulaBarTarget(targetKey);
    }
  }, [activeCell, formulaBarTarget, formulaBarValue, submitFormulaBarValue]);

  const handleFormulaBarKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleFormulaBarCommit();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsFormulaBarEditing(false);
        setFormulaBarValue(getFormulaBarDisplayValue());
        if (activeCell) {
          setFormulaBarTarget(getCellKey(activeCell.row, activeCell.col));
        }
      }
    },
    [activeCell, getFormulaBarDisplayValue, handleFormulaBarCommit]
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
          const value = getCellDisplayValue(r, c);
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
    [isEditing, getEffectiveSelectionRange, getCellDisplayValue, activeCell]
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

          const prevValue = getCellRawInput(targetRow, targetCol);
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
    [isEditing, computeSelectionRange, activeCell, ensureDimensions, setCellValue, getCellRawInput, pushHistoryEntry]
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

  const buildUsedRangeMatrix = useCallback((): string[][] => {
    const range = getUsedRangeFromCells();

    // If no non-empty cells, export a 1x1 empty sheet.
    if (!range) {
      return [['']];
    }

    // NOTE: For MVP we export the used range based on currently loaded cells.
    // If a cell contains formulas, we export the stored string value if present.
    return buildMatrixFromRange(range);
  }, [getUsedRangeFromCells, buildMatrixFromRange]);

  const getExportFileBaseName = useCallback(() => {
    const baseSpreadsheet = spreadsheetName?.trim() || `spreadsheet-${spreadsheetId}`;
    const baseSheet = sheetName?.trim() || `sheet-${sheetId}`;
    return `${baseSpreadsheet}-${baseSheet}`;
  }, [spreadsheetName, sheetName, spreadsheetId, sheetId]);

  const handleExportCSV = useCallback(() => {
    const matrix = buildUsedRangeMatrix();
    const csv = exportMatrixToCSV(matrix);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${getExportFileBaseName()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [buildUsedRangeMatrix, getExportFileBaseName]);

  const handleExportXLSX = useCallback(async () => {
    const matrix = buildUsedRangeMatrix();
    const sheetTitle = sheetName?.trim() || 'Sheet1';
    const blob = await exportMatrixToXLSX(matrix, sheetTitle);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${getExportFileBaseName()}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }, [buildUsedRangeMatrix, getExportFileBaseName, sheetName]);

  const handleImportClick = useCallback(() => {
    if (isImporting) return;
    fileInputRef.current?.click();
  }, [isImporting]);

  const runImportMatrix = useCallback(
    async (matrix: string[][]) => {
      if (!matrix.length) {
        toast.error('Import file is empty');
        return;
      }

      const startRow = 0;
      const startCol = 0;

      const { operations, maxRow, maxCol } = buildCellOperations(matrix, startRow, startCol);
      if (!operations.length) {
        toast.error('No non-empty cells found to import');
        return;
      }

      ensureDimensions(maxRow, maxCol);

      const chunks = chunkOperations<CellOperation>(operations, 1000);
      setImportProgress({ current: 0, total: chunks.length });

      const changes: CellChange[] = [];
      operations.forEach((op) => {
        const prevValue = getCellRawInput(op.row, op.column);
        const nextValue = op.raw_input || '';
        if (prevValue === nextValue) return;
        changes.push({
          row: op.row,
          col: op.column,
          prevValue,
          nextValue,
        });
      });

      if (changes.length) {
        pushHistoryEntry({ changes });
      }

      // Optimistically apply to UI (sparse)
      operations.forEach((op) => {
        applyCellValueLocal(op.row, op.column, op.raw_input || '');
      });

      for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        await SpreadsheetAPI.batchUpdateCells(spreadsheetId, sheetId, chunk, true);
        setImportProgress({ current: i + 1, total: chunks.length });
      }
    },
    [applyCellValueLocal, ensureDimensions, getCellRawInput, pushHistoryEntry, spreadsheetId, sheetId]
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const isCSV = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
      const isXLSX = file.name.toLowerCase().endsWith('.xlsx');

      if (!isCSV) {
        if (!isXLSX) {
          toast.error('Please upload a CSV or XLSX file');
          e.target.value = '';
          return;
        }
      }

      try {
        setIsImporting(true);
        setImportProgress({ current: 0, total: 0 });

        if (isCSV) {
          const matrix = await parseCSVFile(file);
          await runImportMatrix(matrix);
          toast.success('Import complete');
          return;
        }

        const parsed = await parseXLSXFile(file);
        if (!parsed.sheetNames.length) {
          toast.error('No worksheets found');
          return;
        }

        if (parsed.sheetNames.length === 1) {
          const matrix = parsed.sheets[parsed.sheetNames[0]] || [];
          await runImportMatrix(matrix);
          toast.success('Import complete');
          return;
        }

        setXlsxImport(parsed);
        setSelectedXlsxSheet(parsed.sheetNames[0]);
      } catch (error: any) {
        console.error('Import failed:', error);
        toast.error('Import failed. Please check your file.');
      } finally {
        setIsImporting(false);
        setImportProgress(null);
        e.target.value = '';
      }
    },
    [runImportMatrix]
  );

  const handleConfirmXlsxImport = useCallback(async () => {
    if (!xlsxImport || !selectedXlsxSheet) {
      return;
    }

    const matrix = xlsxImport.sheets[selectedXlsxSheet] || [];
    try {
      setIsImporting(true);
      setImportProgress({ current: 0, total: 0 });
      await runImportMatrix(matrix);
      toast.success('Import complete');
      setXlsxImport(null);
      setSelectedXlsxSheet('');
    } catch (error: any) {
      console.error('Import failed:', error);
      toast.error('Import failed. Please check your file.');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  }, [xlsxImport, selectedXlsxSheet, runImportMatrix]);

  const handleCancelXlsxImport = useCallback(() => {
    setXlsxImport(null);
    setSelectedXlsxSheet('');
  }, []);

  useEffect(() => {
    if (!exportMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-export-menu]') || target.closest('[data-export-menu-trigger]')) {
        return;
      }
      setExportMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExportMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [exportMenuOpen]);

  const selectedCellKey = activeCell ? getCellKey(activeCell.row, activeCell.col) : null;
  const editingCellCoords = editingCell ? parseCellKey(editingCell) : null;

  // Derived ranges for virtualized rendering
  const visibleStartRow = Math.max(0, visibleRange.startRow);
  const visibleEndRow = Math.min(rowCount - 1, visibleRange.endRow);
  const visibleStartCol = Math.max(0, visibleRange.startCol);
  const visibleEndCol = Math.min(colCount - 1, visibleRange.endCol);
  const visibleRowCount = Math.max(0, visibleEndRow - visibleStartRow + 1);
  const visibleColCount = Math.max(0, visibleEndCol - visibleStartCol + 1);

  const topSpacerHeight = getRowOffset(visibleStartRow);
  const bottomSpacerHeight = Math.max(0, totalRowHeight - getRowOffset(visibleEndRow + 1));
  const leftSpacerWidth = getColumnOffset(visibleStartCol);
  const rightSpacerWidth = Math.max(0, totalColumnWidth - getColumnOffset(visibleEndCol + 1));

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
    boxSizing: 'border-box',
  };

  const headerCellStyle: React.CSSProperties = {
    ...cellBaseStyle,
    height: `${HEADER_HEIGHT}px`,
    minHeight: `${HEADER_HEIGHT}px`,
  };

  const cellContentBaseStyle: React.CSSProperties = {
    padding: `${CELL_PADDING_Y}px ${CELL_PADDING_X}px`,
    boxSizing: 'border-box',
    fontSize: `${CELL_FONT_SIZE}px`,
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  };

  const cellInputBaseStyle: React.CSSProperties = {
    padding: `${CELL_PADDING_Y}px ${CELL_PADDING_X}px`,
    boxSizing: 'border-box',
    fontSize: `${CELL_FONT_SIZE}px`,
    border: 'none',
    outline: 'none',
  };

  const getCellBaseStyle = (height: number): React.CSSProperties => ({
    ...cellBaseStyle,
    height: `${height}px`,
    minHeight: `${height}px`,
  });

  const getCellContentStyle = (height: number): React.CSSProperties => ({
    ...cellContentBaseStyle,
    height: `${height}px`,
    lineHeight: `${Math.max(0, height - CELL_PADDING_Y * 2)}px`,
  });

  const getCellInputStyle = (height: number): React.CSSProperties => ({
    ...cellInputBaseStyle,
    height: `${height}px`,
    lineHeight: `${Math.max(0, height - CELL_PADDING_Y * 2)}px`,
  });

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
      {isImporting && importProgress && (
        <div className="absolute top-2 left-2 z-30 bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-1 rounded text-xs">
          Importing... {importProgress.current}/{importProgress.total}
        </div>
      )}

      {/* Import/Export actions */}
      <div className="flex items-center justify-end gap-2 px-2 py-2 border-b border-gray-200 bg-white">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={handleImportClick}
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
                setExportMenuAnchor({
                  top: rect.bottom + 6,
                  left: rect.right,
                  width: rect.width,
                });
              }
              setExportMenuOpen((prev) => !prev);
            }}
            disabled={isImporting}
            className="rounded border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            aria-haspopup="menu"
            aria-expanded={exportMenuOpen}
            data-export-menu-trigger
          >
            Export
          </button>
          {exportMenuOpen && exportMenuAnchor &&
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
                    handleExportCSV();
                    setExportMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  role="menuitem"
                >
                  Export as CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExportXLSX();
                    setExportMenuOpen(false);
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

      <div className="flex items-center gap-2 px-2 py-2 border-b border-gray-200 bg-white">
        <span className="text-xs font-semibold text-gray-500">fx</span>
        <input
          type="text"
          value={formulaBarValue}
          placeholder="Enter value or formula"
          onFocus={() => {
            setIsFormulaBarEditing(true);
            if (!formulaBarTarget && activeCell) {
              setFormulaBarTarget(getCellKey(activeCell.row, activeCell.col));
            }
          }}
          onChange={handleFormulaBarChange}
          onBlur={handleFormulaBarCommit}
          onKeyDown={(e) => {
            e.stopPropagation();
            handleFormulaBarKeyDown(e);
          }}
          className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-blue-400 focus:outline-none"
          disabled={!activeCell}
        />
      </div>

      {xlsxImport && (
        <Modal isOpen={true} onClose={handleCancelXlsxImport}>
          <div className="w-[min(420px,calc(100vw-2rem))]">
            <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100">
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Select Worksheet</h2>
                <p className="text-sm text-gray-600">
                  Choose a worksheet to import into the current sheet.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <select
                  value={selectedXlsxSheet}
                  onChange={(e) => setSelectedXlsxSheet(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isImporting}
                >
                  {xlsxImport.sheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancelXlsxImport}
                    className="rounded border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    disabled={isImporting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmXlsxImport}
                    className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    disabled={isImporting || !selectedXlsxSheet}
                  >
                    Import
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
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
            width: `${ROW_NUMBER_WIDTH + totalColumnWidth}px`,
          }}
        >
          <colgroup>
            <col style={{ width: `${ROW_NUMBER_WIDTH}px`, minWidth: `${ROW_NUMBER_WIDTH}px` }} />
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

          {/* Column Headers */}
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th
                className="border border-gray-300 bg-gray-200 text-xs font-semibold text-gray-600 text-center sticky left-0 z-20"
                style={headerCellStyle}
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleSelectAll}
                data-testid="select-all-cell"
              >
                {/* Empty corner cell */}
              </th>
              <th
                className="border border-gray-300 bg-gray-200 p-0"
                style={{ width: `${leftSpacerWidth}px`, ...headerCellStyle }}
              />
              {Array.from({ length: visibleColCount }).map((_, colOffset) => {
                const colIndex = visibleStartCol + colOffset;
                const colWidth = getColumnWidth(colIndex);
                return (
                <th
                  key={colIndex}
                  className="border border-gray-300 bg-gray-200 text-xs font-semibold text-gray-600 text-center relative overflow-visible"
                  style={{ width: `${colWidth}px`, minWidth: `${colWidth}px`, ...headerCellStyle }}
                >
                  {columnIndexToLabel(colIndex)}
                  <div
                    data-testid={`col-resize-handle-${colIndex}`}
                    className="absolute top-0"
                    style={{
                      right: `-${RESIZE_HANDLE_SIZE / 2}px`,
                      width: `${RESIZE_HANDLE_SIZE}px`,
                      height: '100%',
                      cursor: 'col-resize',
                    }}
                    onPointerDown={(e) => startResize(e, 'col', colIndex)}
                    onPointerMove={handleResizePointerMove}
                    onPointerUp={handleResizePointerUp}
                    onPointerCancel={handleResizePointerUp}
                  />
                </th>
                );
              })}
              <th
                className="border border-gray-300 bg-gray-200 p-0"
                style={{ width: `${rightSpacerWidth}px`, ...headerCellStyle }}
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
              const rowHeight = getRowHeight(row);
              const rowBaseStyle = getCellBaseStyle(rowHeight);
              return (
                <tr key={row}>
                  {/* Row Number */}
                  <td
                    className="border border-gray-300 bg-gray-100 text-xs font-semibold text-gray-600 text-center sticky left-0 z-10 relative overflow-visible"
                    style={rowBaseStyle}
                    data-testid={`row-header-${row}`}
                  >
                    {row + 1}
                    <div
                      data-testid={`row-resize-handle-${row}`}
                      className="absolute left-0"
                      style={{
                        bottom: `-${RESIZE_HANDLE_SIZE / 2}px`,
                        width: '100%',
                        height: `${RESIZE_HANDLE_SIZE}px`,
                        cursor: 'row-resize',
                      }}
                      onPointerDown={(e) => startResize(e, 'row', row)}
                      onPointerMove={handleResizePointerMove}
                      onPointerUp={handleResizePointerUp}
                      onPointerCancel={handleResizePointerUp}
                    />
                  </td>

                  {/* Left spacer */}
                  <td
                    className="border border-gray-300 p-0"
                    style={{ width: `${leftSpacerWidth}px`, ...rowBaseStyle }}
                  />

                  {/* Data Cells */}
                  {Array.from({ length: visibleColCount }).map((_, colOffset) => {
                    const col = visibleStartCol + colOffset; // 0-based for API
                    const colWidth = getColumnWidth(col);
                    const key = getCellKey(row, col);
                    const isActive = activeCell && activeCell.row === row && activeCell.col === col;
                    const isInSelection = isCellInSelection(row, col);
                    const isEditing = editingCell === key;
                    const showFillHandle = Boolean(
                      isActive && isSingleCellSelection && !isEditing && !isFilling
                    );
                    const displayValue = isEditing ? editValue : getCellDisplayValue(row, col);
                    
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
                    if (isCellInFillPreview(row, col)) {
                      cellClassName += ' bg-blue-50';
                    }

                    return (
                      <td
                        key={`${row}-${col}`}
                        className={cellClassName}
                        onMouseDown={(e) => handleCellMouseDown(e, row, col)}
                        onDoubleClick={() => handleCellDoubleClick(row, col)}
                        style={{ width: `${colWidth}px`, minWidth: `${colWidth}px`, ...rowBaseStyle }}
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
                            style={{ width: `${colWidth}px`, minWidth: `${colWidth}px`, ...getCellInputStyle(rowHeight) }}
                          />
                        ) : (
                          <div className="text-gray-900" style={getCellContentStyle(rowHeight)}>
                            {displayValue}
                          </div>
                        )}
                        {showFillHandle && (
                          <div
                            className="absolute bottom-0 right-0 h-2 w-2 bg-blue-600 border border-white cursor-crosshair"
                            onPointerDown={(e) => handleFillHandlePointerDown(e, row, col)}
                          />
                        )}
                      </td>
                    );
                  })}

                  {/* Right spacer */}
                  <td
                    className="border border-gray-300 p-0"
                    style={{ width: `${rightSpacerWidth}px`, ...rowBaseStyle }}
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
