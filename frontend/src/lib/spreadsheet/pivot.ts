/**
 * Pivot table utility functions for spreadsheet data aggregation.
 * MVP: Groups rows by one column and aggregates another column.
 */

export type AggregationFunction = 'SUM' | 'COUNT' | 'AVG';

export interface PivotResult {
  group: string;
  value: number;
}

/**
 * Performs pivot aggregation on spreadsheet row data.
 *
 * @param data - Array of row objects, each row is a Record<colIndex, cellValue>
 * @param groupByCol - Column index to group by
 * @param valueCol - Column index to aggregate
 * @param aggFunction - Aggregation function to apply
 * @returns Array of pivot results sorted by group name
 */
export function pivot(
  data: Array<Record<number, string>>,
  groupByCol: number,
  valueCol: number,
  aggFunction: AggregationFunction
): PivotResult[] {
  const groups = new Map<string, number[]>();

  for (const row of data) {
    const groupKey = (row[groupByCol] ?? '').trim();
    if (!groupKey) continue;

    const rawValue = (row[valueCol] ?? '').trim();
    const numericValue = parseFloat(rawValue);
    const valueToUse = isNaN(numericValue) ? 0 : numericValue;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(valueToUse);
  }

  const results: PivotResult[] = [];

  for (const [group, values] of groups) {
    let aggregatedValue: number;

    switch (aggFunction) {
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

    results.push({ group, value: aggregatedValue });
  }

  return results.sort((a, b) => a.group.localeCompare(b.group));
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
