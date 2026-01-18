export interface CellOperation {
  operation: 'set' | 'clear';
  row: number;
  column: number;
  value_type?: string;
  string_value?: string | null;
}

export interface XLSXParseResult {
  sheetNames: string[];
  sheets: Record<string, string[][]>;
}

// Lazy import type for xlsx to keep module extensible
type XLSXModule = typeof import('xlsx');

/**
 * Parse CSV text into a 2D string matrix.
 * Basic RFC4180-style parsing with quoted fields.
 */
export const parseCSVText = (text: string): string[][] => {
  if (!text) return [];

  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(current);
      current = '';
      continue;
    }

    if (char === '\n') {
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    if (char === '\r') {
      // Ignore CR; LF will handle row break
      continue;
    }

    current += char;
  }

  row.push(current);
  rows.push(row);

  // Drop trailing empty rows
  while (rows.length > 0) {
    const last = rows[rows.length - 1];
    if (last.every((cell) => cell === '')) {
      rows.pop();
    } else {
      break;
    }
  }

  return rows;
};

export const parseCSVFile = async (file: File): Promise<string[][]> => {
  const text = await file.text();
  return parseCSVText(text);
};

export const parseXLSXFile = async (file: File): Promise<XLSXParseResult> => {
  const XLSXImport: XLSXModule = await import('xlsx');
  const XLSX = (XLSXImport as any).default ?? XLSXImport;
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  const sheetNames = (workbook.SheetNames || []) as string[];
  const sheets: Record<string, string[][]> = {};

  sheetNames.forEach((name: string) => {
    const sheet = workbook.Sheets[name];
    if (!sheet) return;
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as string[][];
    sheets[name] = matrix.map((row) => row.map((cell) => (cell ?? '') as string));
  });

  return { sheetNames, sheets };
};

/**
 * Build sparse batch operations from a 2D matrix.
 * Only non-empty values are included.
 */
export const buildCellOperations = (
  matrix: string[][],
  startRow: number,
  startCol: number
): { operations: CellOperation[]; maxRow: number; maxCol: number } => {
  const operations: CellOperation[] = [];
  let maxRow = startRow;
  let maxCol = startCol;

  for (let r = 0; r < matrix.length; r += 1) {
    const row = matrix[r];
    for (let c = 0; c < row.length; c += 1) {
      const value = row[c] ?? '';
      const targetRow = startRow + r;
      const targetCol = startCol + c;
      maxRow = Math.max(maxRow, targetRow);
      maxCol = Math.max(maxCol, targetCol);

      if (value === '') continue;

      operations.push({
        operation: 'set',
        row: targetRow,
        column: targetCol,
        value_type: 'string',
        string_value: value,
      });
    }
  }

  return { operations, maxRow, maxCol };
};

export const chunkOperations = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const escapeCSVCell = (value: string): string => {
  if (value.includes('"')) {
    value = value.replace(/"/g, '""');
  }
  if (value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value}"`;
  }
  return value;
};

export const exportMatrixToCSV = (matrix: string[][]): string => {
  const lines = matrix.map((row) => row.map((cell) => escapeCSVCell(cell ?? '')).join(','));
  return lines.join('\n');
};

export const exportMatrixToXLSX = async (matrix: string[][], sheetName: string): Promise<Blob> => {
  const XLSXImport: XLSXModule = await import('xlsx');
  const XLSX = (XLSXImport as any).default ?? XLSXImport;
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(matrix);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Sheet1');

  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};

