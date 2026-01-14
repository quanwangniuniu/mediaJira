'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SpreadsheetAPI } from '@/lib/api/spreadsheetApi';

interface SpreadsheetGridProps {
  spreadsheetId: number;
  sheetId: number;
}

type CellValue = string | number | boolean | null;
type CellKey = string; // Format: `${row}:${col}`

interface CellData {
  value: CellValue;
  displayValue: string;
}

const ROWS = 100;
const COLUMNS = 26; // A-Z

const getColumnLabel = (index: number): string => {
  return String.fromCharCode(65 + index); // A=65, B=66, etc.
};

const getCellKey = (row: number, col: number): CellKey => {
  return `${row}:${col}`;
};

const parseCellKey = (key: CellKey): { row: number; col: number } => {
  const [row, col] = key.split(':').map(Number);
  return { row, col };
};

const formatCellValue = (value: CellValue): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

export default function SpreadsheetGrid({ spreadsheetId, sheetId }: SpreadsheetGridProps) {
  const [cells, setCells] = useState<Map<CellKey, CellData>>(new Map());
  const [selectedCell, setSelectedCell] = useState<CellKey | null>(null);
  const [editingCell, setEditingCell] = useState<CellKey | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Data access abstraction layer
  // This allows easy switching between local state and API later
  const getCellValue = useCallback(
    async (row: number, col: number): Promise<CellValue> => {
      const key = getCellKey(row, col);
      const cellData = cells.get(key);
      if (cellData) {
        return cellData.value;
      }

      // TODO: Implement API call to fetch cell value from backend
      // Example:
      // try {
      //   const range = await SpreadsheetAPI.readCellRange(
      //     spreadsheetId,
      //     sheetId,
      //     row,
      //     row,
      //     col,
      //     col
      //   );
      //   if (range.cells.length > 0) {
      //     const cell = range.cells[0];
      //     const value = cell.string_value ?? cell.number_value ?? cell.boolean_value ?? null;
      //     const displayValue = formatCellValue(value);
      //     setCells(prev => {
      //       const next = new Map(prev);
      //       next.set(key, { value, displayValue });
      //       return next;
      //     });
      //     return value;
      //   }
      // } catch (error) {
      //   console.error('Failed to fetch cell value:', error);
      // }

      return null;
    },
    [cells, spreadsheetId, sheetId]
  );

  const setCellValue = useCallback(
    async (row: number, col: number, value: CellValue): Promise<void> => {
      const key = getCellKey(row, col);
      const displayValue = formatCellValue(value);

      // Update local state immediately for instant UI feedback
      setCells((prev) => {
        const next = new Map(prev);
        next.set(key, { value, displayValue });
        return next;
      });

      // TODO: Implement API call to save cell value to backend
      // Example:
      // try {
      //   await SpreadsheetAPI.batchUpdateCells(
      //     spreadsheetId,
      //     sheetId,
      //     [
      //       {
      //         operation: value === null ? 'clear' : 'set',
      //         row,
      //         column: col,
      //         value_type: value === null ? undefined : typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string',
      //         string_value: typeof value === 'string' ? value : undefined,
      //         number_value: typeof value === 'number' ? value : undefined,
      //         boolean_value: typeof value === 'boolean' ? value : undefined,
      //       },
      //     ],
      //     true // auto_expand
      //   );
      // } catch (error) {
      //   console.error('Failed to save cell value:', error);
      //   // Optionally revert local state on error
      //   setCells(prev => {
      //     const next = new Map(prev);
      //     next.delete(key);
      //     return next;
      //   });
      // }
    },
    [spreadsheetId, sheetId]
  );

  // Handle cell click
  const handleCellClick = useCallback((row: number, col: number) => {
    const key = getCellKey(row, col);
    setSelectedCell(key);
    setEditingCell(null);
  }, []);

  // Handle cell double click
  const handleCellDoubleClick = useCallback((row: number, col: number) => {
    const key = getCellKey(row, col);
    const cellData = cells.get(key);
    setEditingCell(key);
    setEditValue(cellData?.displayValue || '');
  }, [cells]);

  // Handle Enter key to start editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedCell && !editingCell) {
        if (e.key === 'Enter' || e.key === 'F2') {
          e.preventDefault();
          const { row, col } = parseCellKey(selectedCell);
          handleCellDoubleClick(row, col);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, editingCell, handleCellDoubleClick]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Handle commit cell edit
  const handleCommitEdit = useCallback(async () => {
    if (!editingCell) return;

    const { row, col } = parseCellKey(editingCell);
    const trimmedValue = editValue.trim();

    // Convert to appropriate type or null
    let value: CellValue = trimmedValue === '' ? null : trimmedValue;

    // Try to parse as number if it looks like a number
    if (trimmedValue && /^-?\d*\.?\d+$/.test(trimmedValue)) {
      const numValue = parseFloat(trimmedValue);
      if (!isNaN(numValue)) {
        value = numValue;
      }
    }

    await setCellValue(row, col, value);
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
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelEdit();
      }
    },
    [handleCommitEdit, handleCancelEdit]
  );

  const getCellDisplayValue = useCallback(
    (row: number, col: number): string => {
      const key = getCellKey(row, col);
      const cellData = cells.get(key);
      return cellData?.displayValue || '';
    },
    [cells]
  );

  return (
    <div ref={gridRef} className="relative h-full w-full overflow-auto border border-gray-300 bg-white">
      {/* Grid Table */}
      <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '50px', minWidth: '50px' }} /> {/* Row numbers column */}
          {Array.from({ length: COLUMNS }).map((_, colIndex) => (
            <col key={colIndex} style={{ width: '120px', minWidth: '120px' }} />
          ))}
        </colgroup>

        {/* Column Headers */}
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            <th className="border border-gray-300 bg-gray-200 p-1 text-xs font-semibold text-gray-600 text-center sticky left-0 z-20">
              {/* Empty corner cell */}
            </th>
            {Array.from({ length: COLUMNS }).map((_, colIndex) => (
              <th
                key={colIndex}
                className="border border-gray-300 bg-gray-200 p-1 text-xs font-semibold text-gray-600 text-center"
              >
                {getColumnLabel(colIndex)}
              </th>
            ))}
          </tr>
        </thead>

        {/* Grid Body */}
        <tbody>
          {Array.from({ length: ROWS }).map((_, rowIndex) => {
            const row = rowIndex; // 0-indexed
            return (
              <tr key={rowIndex}>
                {/* Row Number */}
                <td className="border border-gray-300 bg-gray-100 p-1 text-xs font-semibold text-gray-600 text-center sticky left-0 z-10">
                  {row + 1}
                </td>

                {/* Data Cells */}
                {Array.from({ length: COLUMNS }).map((_, colIndex) => {
                  const col = colIndex; // 0-indexed
                  const key = getCellKey(row, col);
                  const isSelected = selectedCell === key;
                  const isEditing = editingCell === key;
                  const displayValue = getCellDisplayValue(row, col);

                  return (
                    <td
                      key={colIndex}
                      className={`border border-gray-300 p-0 relative ${
                        isSelected && !isEditing ? 'ring-2 ring-blue-500 ring-inset' : ''
                      } ${isEditing ? 'ring-2 ring-blue-600 ring-inset' : ''}`}
                      onClick={() => handleCellClick(row, col)}
                      onDoubleClick={() => handleCellDoubleClick(row, col)}
                      style={{ minWidth: '120px', height: '24px' }}
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
                          style={{ minWidth: '120px' }}
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
  );
}

