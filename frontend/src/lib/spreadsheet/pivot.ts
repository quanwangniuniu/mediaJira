/**
 * Pivot table transformation utilities.
 * Supports Google Sheets-style 2D pivot with Rows, Columns, Values, and Aggregation.
 */

export type AggregationFunction = 'SUM' | 'COUNT' | 'AVG';

export interface PivotConfig {
  sourceSheetId: number;
  rowField: string | null;
  columnField: string | null;
  valueField: string | null;
  aggregation: AggregationFunction;
}

export interface PivotTableResult {
  headers: string[];
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

/**
 * Build a 2D pivot table from source data.
 *
 * @param sourceRows - Array of row data (excluding header row)
 * @param columns - Array of column definitions from header row
 * @param config - Pivot configuration
 * @returns PivotTableResult with headers and body ready to write to a sheet
 */
export function buildPivotTable(
  sourceRows: SourceRow[],
  columns: SourceColumn[],
  config: Pick<PivotConfig, 'rowField' | 'columnField' | 'valueField' | 'aggregation'>
): PivotTableResult {
  const { rowField, columnField, valueField, aggregation } = config;

  const rowColIndex = columns.find((c) => c.header === rowField)?.index;
  const colColIndex = columns.find((c) => c.header === columnField)?.index;
  const valueColIndex = columns.find((c) => c.header === valueField)?.index;

  if (rowColIndex === undefined || valueColIndex === undefined) {
    return { headers: [], body: [], rowCount: 0, colCount: 0 };
  }

  const uniqueRowValues = new Set<string>();
  const uniqueColValues = new Set<string>();
  const dataMap = new Map<string, number[]>();

  for (const row of sourceRows) {
    const rowKey = (row[rowColIndex] ?? '').trim();
    if (!rowKey) continue;

    uniqueRowValues.add(rowKey);

    const colKey = colColIndex !== undefined ? (row[colColIndex] ?? '').trim() : '__TOTAL__';
    if (colColIndex !== undefined && colKey) {
      uniqueColValues.add(colKey);
    }

    const rawValue = (row[valueColIndex] ?? '').trim();
    const numValue = parseFloat(rawValue);
    const valueToUse = isNaN(numValue) ? 0 : numValue;

    const mapKey = `${rowKey}|||${colKey}`;
    if (!dataMap.has(mapKey)) {
      dataMap.set(mapKey, []);
    }
    dataMap.get(mapKey)!.push(valueToUse);
  }

  const sortedRowKeys = Array.from(uniqueRowValues).sort((a, b) => a.localeCompare(b));
  const sortedColKeys =
    colColIndex !== undefined
      ? Array.from(uniqueColValues).sort((a, b) => a.localeCompare(b))
      : ['__TOTAL__'];

  const hasColumnField = colColIndex !== undefined && sortedColKeys.length > 0 && sortedColKeys[0] !== '__TOTAL__';

  const headers: string[] = [rowField || 'Row'];
  if (hasColumnField) {
    headers.push(...sortedColKeys);
  } else {
    const aggLabel = `${aggregation}(${valueField || 'Value'})`;
    headers.push(aggLabel);
  }

  const body: (string | number)[][] = [];

  for (const rowKey of sortedRowKeys) {
    const rowData: (string | number)[] = [rowKey];

    for (const colKey of sortedColKeys) {
      const mapKey = `${rowKey}|||${colKey}`;
      const values = dataMap.get(mapKey) ?? [];

      let aggregatedValue: number;
      switch (aggregation) {
        case 'SUM':
          aggregatedValue = values.reduce((sum, v) => sum + v, 0);
          break;
        case 'COUNT':
          aggregatedValue = values.length;
          break;
        case 'AVG':
          aggregatedValue = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
          break;
        default:
          aggregatedValue = 0;
      }

      rowData.push(aggregatedValue);
    }

    body.push(rowData);
  }

  return {
    headers,
    body,
    rowCount: body.length + 1,
    colCount: headers.length,
  };
}

/**
 * Format a number for display in pivot results.
 * Shows up to 2 decimal places, removes trailing zeros.
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
 */
export function pivotResultToCellOperations(
  result: PivotTableResult
): Array<{ operation: 'set'; row: number; column: number; raw_input: string }> {
  const operations: Array<{ operation: 'set'; row: number; column: number; raw_input: string }> = [];

  for (let col = 0; col < result.headers.length; col++) {
    operations.push({
      operation: 'set',
      row: 0,
      column: col,
      raw_input: result.headers[col],
    });
  }

  for (let row = 0; row < result.body.length; row++) {
    for (let col = 0; col < result.body[row].length; col++) {
      const cellValue = result.body[row][col];
      const rawInput = typeof cellValue === 'number' 
        ? (cellValue === 0 ? '' : String(cellValue))
        : String(cellValue);
      operations.push({
        operation: 'set',
        row: row + 1,
        column: col,
        raw_input: rawInput,
      });
    }
  }

  return operations;
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
