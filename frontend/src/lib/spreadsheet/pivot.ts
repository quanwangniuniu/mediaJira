/**
 * Pivot table transformation utilities.
 * Supports Google Sheets-style pivot with multiple Rows, Columns, and Values.
 * Each value field has its own aggregation setting.
 */

export type AggregationFunction = 'SUM' | 'COUNT' | 'AVG';

export interface PivotValueConfig {
  field: string;
  aggregation: AggregationFunction;
}

export interface PivotConfig {
  sourceSheetId: number;
  rows: string[];
  columns: string[];
  values: PivotValueConfig[];
}

export interface PivotTableResult {
  headers: string[][];
  body: (string | number)[][];
  rowCount: number;
  colCount: number;
}

export interface SourceColumn {
  index: number;
  header: string;
}

export interface SourceRow {
  [columnIndex: number]: string;
}

function getFieldIndex(columns: SourceColumn[], fieldName: string): number | undefined {
  return columns.find((c) => c.header === fieldName)?.index;
}

/**
 * Round a number to a safe precision to avoid floating-point artifacts.
 * Uses 10 decimal places internally, which is more than enough for currency/metrics.
 */
function roundToPrecision(value: number, decimals: number = 10): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function aggregate(values: number[], aggregation: AggregationFunction): number {
  if (values.length === 0) return 0;
  let result: number;
  switch (aggregation) {
    case 'SUM':
      result = values.reduce((sum, v) => sum + v, 0);
      break;
    case 'COUNT':
      return values.length;
    case 'AVG':
      result = values.reduce((sum, v) => sum + v, 0) / values.length;
      break;
    default:
      return 0;
  }
  return roundToPrecision(result);
}

function buildCompositeKey(row: SourceRow, fieldIndices: number[]): string {
  return fieldIndices.map((idx) => (row[idx] ?? '').trim()).join('|||');
}

/**
 * Build a pivot table from source data with multiple rows, columns, and values.
 */
export function buildPivotTable(
  sourceRows: SourceRow[],
  columns: SourceColumn[],
  config: Pick<PivotConfig, 'rows' | 'columns' | 'values'>
): PivotTableResult {
  const { rows: rowFields, columns: columnFields, values: valueConfigs } = config;

  if (rowFields.length === 0 || valueConfigs.length === 0) {
    return { headers: [], body: [], rowCount: 0, colCount: 0 };
  }

  const rowFieldIndices = rowFields
    .map((f) => getFieldIndex(columns, f))
    .filter((idx): idx is number => idx !== undefined);

  const colFieldIndices = columnFields
    .map((f) => getFieldIndex(columns, f))
    .filter((idx): idx is number => idx !== undefined);

  const valueFieldIndices = valueConfigs
    .map((vc) => ({
      index: getFieldIndex(columns, vc.field),
      aggregation: vc.aggregation,
      field: vc.field,
    }))
    .filter((vc): vc is { index: number; aggregation: AggregationFunction; field: string } => 
      vc.index !== undefined
    );

  if (rowFieldIndices.length === 0 || valueFieldIndices.length === 0) {
    return { headers: [], body: [], rowCount: 0, colCount: 0 };
  }

  const uniqueRowKeys = new Set<string>();
  const uniqueColKeys = new Set<string>();
  const dataMap = new Map<string, Map<number, number[]>>();

  for (const row of sourceRows) {
    const rowKey = buildCompositeKey(row, rowFieldIndices);
    if (rowFieldIndices.some((idx) => !(row[idx] ?? '').trim())) continue;

    uniqueRowKeys.add(rowKey);

    let colKey = '__TOTAL__';
    if (colFieldIndices.length > 0) {
      colKey = buildCompositeKey(row, colFieldIndices);
      if (colKey.split('|||').every((k) => k)) {
        uniqueColKeys.add(colKey);
      } else {
        colKey = '__TOTAL__';
      }
    }

    const mapKey = `${rowKey}:::${colKey}`;
    if (!dataMap.has(mapKey)) {
      dataMap.set(mapKey, new Map());
    }
    const valueMap = dataMap.get(mapKey)!;

    for (let vi = 0; vi < valueFieldIndices.length; vi++) {
      const { index } = valueFieldIndices[vi];
      const rawValue = (row[index] ?? '').trim();
      const numValue = parseFloat(rawValue);
      const valueToUse = isNaN(numValue) ? 0 : numValue;

      if (!valueMap.has(vi)) {
        valueMap.set(vi, []);
      }
      valueMap.get(vi)!.push(valueToUse);
    }
  }

  const sortedRowKeys = Array.from(uniqueRowKeys).sort((a, b) => a.localeCompare(b));
  const sortedColKeys =
    colFieldIndices.length > 0 && uniqueColKeys.size > 0
      ? Array.from(uniqueColKeys).sort((a, b) => a.localeCompare(b))
      : ['__TOTAL__'];

  const hasColumnFields = colFieldIndices.length > 0 && sortedColKeys[0] !== '__TOTAL__';

  const headers: string[][] = [];
  const rowHeaderCount = rowFields.length;

  if (hasColumnFields && valueFieldIndices.length > 0) {
    if (columnFields.length === 1) {
      const headerRow1: string[] = [...rowFields];
      for (const colKey of sortedColKeys) {
        for (let i = 0; i < valueFieldIndices.length; i++) {
          if (i === 0) {
            headerRow1.push(colKey);
          } else {
            headerRow1.push('');
          }
        }
      }
      headers.push(headerRow1);
    } else {
      const headerRow1: string[] = [...rowFields];
      for (const colKey of sortedColKeys) {
        for (let i = 0; i < valueFieldIndices.length; i++) {
          if (i === 0) {
            headerRow1.push(colKey.split('|||').join(' / '));
          } else {
            headerRow1.push('');
          }
        }
      }
      headers.push(headerRow1);
    }

    const headerRow2: string[] = rowFields.map(() => '');
    for (const _colKey of sortedColKeys) {
      for (const vc of valueFieldIndices) {
        headerRow2.push(`${vc.aggregation}(${vc.field})`);
      }
    }
    headers.push(headerRow2);
  } else {
    const headerRow: string[] = [...rowFields];
    for (const vc of valueFieldIndices) {
      headerRow.push(`${vc.aggregation}(${vc.field})`);
    }
    headers.push(headerRow);
  }

  const body: (string | number)[][] = [];

  for (const rowKey of sortedRowKeys) {
    const rowParts = rowKey.split('|||');
    const rowData: (string | number)[] = [...rowParts];

    for (const colKey of sortedColKeys) {
      const mapKey = `${rowKey}:::${colKey}`;
      const valueMap = dataMap.get(mapKey);

      for (let vi = 0; vi < valueFieldIndices.length; vi++) {
        const { aggregation } = valueFieldIndices[vi];
        const values = valueMap?.get(vi) ?? [];
        const aggregatedValue = aggregate(values, aggregation);
        rowData.push(aggregatedValue);
      }
    }

    body.push(rowData);
  }

  const totalHeaderRows = headers.length;
  const totalCols = headers[0]?.length ?? 0;

  return {
    headers,
    body,
    rowCount: body.length + totalHeaderRows,
    colCount: totalCols,
  };
}

/**
 * Format a number for display in pivot results.
 */
export function formatPivotValue(value: number): string {
  if (Number.isInteger(value)) {
    return value.toLocaleString();
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Convert pivot result to cell operations for batch update.
 * Numbers are formatted to avoid floating-point display artifacts.
 */
export function pivotResultToCellOperations(
  result: PivotTableResult
): Array<{ operation: 'set'; row: number; column: number; raw_input: string }> {
  const operations: Array<{ operation: 'set'; row: number; column: number; raw_input: string }> = [];

  for (let hi = 0; hi < result.headers.length; hi++) {
    const headerRow = result.headers[hi];
    for (let col = 0; col < headerRow.length; col++) {
      operations.push({
        operation: 'set',
        row: hi,
        column: col,
        raw_input: headerRow[col],
      });
    }
  }

  const headerOffset = result.headers.length;
  for (let row = 0; row < result.body.length; row++) {
    for (let col = 0; col < result.body[row].length; col++) {
      const cellValue = result.body[row][col];
      let rawInput: string;
      if (typeof cellValue === 'number') {
        if (cellValue === 0) {
          rawInput = '';
        } else {
          rawInput = formatNumberForCell(cellValue);
        }
      } else {
        rawInput = String(cellValue);
      }
      operations.push({
        operation: 'set',
        row: row + headerOffset,
        column: col,
        raw_input: rawInput,
      });
    }
  }

  return operations;
}

/**
 * Format a number for cell storage, avoiding floating-point display artifacts.
 * Preserves up to 10 significant decimal places, removes trailing zeros.
 */
function formatNumberForCell(value: number): string {
  const rounded = roundToPrecision(value, 10);
  const str = rounded.toPrecision(15);
  const parsed = parseFloat(str);
  return String(parsed);
}

/**
 * Generate clear operations for cells outside the new pivot bounds.
 * This ensures stale data from a previous larger pivot is removed.
 */
export function generateClearOperationsForStaleCells(
  previousRowCount: number,
  previousColCount: number,
  newRowCount: number,
  newColCount: number
): Array<{ operation: 'clear'; row: number; column: number }> {
  const clearOps: Array<{ operation: 'clear'; row: number; column: number }> = [];

  for (let row = 0; row < previousRowCount; row++) {
    for (let col = newColCount; col < previousColCount; col++) {
      clearOps.push({ operation: 'clear', row, column: col });
    }
  }

  for (let row = newRowCount; row < previousRowCount; row++) {
    for (let col = 0; col < newColCount; col++) {
      clearOps.push({ operation: 'clear', row, column: col });
    }
  }

  return clearOps;
}

/**
 * Generate a unique pivot table sheet name.
 */
export function generatePivotSheetName(existingNames: string[]): string {
  const pivotRegex = /^Pivot Table (\d+)$/i;
  let maxNumber = 0;

  for (const name of existingNames) {
    const match = name.match(pivotRegex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  return `Pivot Table ${maxNumber + 1}`;
}

/**
 * Create an empty pivot config.
 */
export function createEmptyPivotConfig(sourceSheetId: number): PivotConfig {
  return {
    sourceSheetId,
    rows: [],
    columns: [],
    values: [],
  };
}

/**
 * Check if a pivot config is valid (has at least one row and one value).
 */
export function isPivotConfigValid(config: PivotConfig): boolean {
  return config.rows.length > 0 && config.values.length > 0;
}
