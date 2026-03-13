'use client';

import { useState, useMemo, useCallback } from 'react';
import { X, Table2, Loader2, GripVertical, Rows3, Columns3, Calculator, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  buildPivotTable,
  pivotResultToCellOperations,
  generatePivotSheetName,
  AggregationFunction,
  SourceColumn,
  SourceRow,
  PivotTableResult,
} from '@/lib/spreadsheet/pivot';

interface CellData {
  rawInput: string;
  computedString?: string | null;
}

interface PivotBuilderPanelProps {
  isOpen: boolean;
  cells: Map<string, CellData>;
  rowCount: number;
  colCount: number;
  sourceSheetId: number;
  sourceSheetName: string;
  existingSheetNames: string[];
  onClose: () => void;
  onCreatePivotSheet: (
    sheetName: string,
    operations: Array<{ operation: 'set'; row: number; column: number; raw_input: string }>,
    dimensions: { rowCount: number; colCount: number }
  ) => Promise<void>;
}

const AGGREGATION_OPTIONS: { value: AggregationFunction; label: string }[] = [
  { value: 'SUM', label: 'SUM' },
  { value: 'COUNT', label: 'COUNT' },
  { value: 'AVG', label: 'AVERAGE' },
];

function getCellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

export function PivotBuilderPanel({
  isOpen,
  cells,
  rowCount,
  colCount,
  sourceSheetId,
  sourceSheetName,
  existingSheetNames,
  onClose,
  onCreatePivotSheet,
}: PivotBuilderPanelProps) {
  const [rowField, setRowField] = useState<string>('');
  const [columnField, setColumnField] = useState<string>('__none__');
  const [valueField, setValueField] = useState<string>('');
  const [aggregation, setAggregation] = useState<AggregationFunction>('SUM');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const columns = useMemo((): SourceColumn[] => {
    const cols: SourceColumn[] = [];
    for (let col = 0; col < colCount; col++) {
      const cellData = cells.get(getCellKey(0, col));
      const header = (cellData?.rawInput ?? '').trim();
      if (header) {
        cols.push({ index: col, header });
      }
    }
    return cols;
  }, [cells, colCount]);

  const sourceRows = useMemo((): SourceRow[] => {
    const data: SourceRow[] = [];
    for (let row = 1; row < rowCount; row++) {
      const rowRecord: SourceRow = {};
      let hasData = false;
      for (let col = 0; col < colCount; col++) {
        const cellData = cells.get(getCellKey(row, col));
        const value = cellData?.computedString ?? cellData?.rawInput ?? '';
        rowRecord[col] = value;
        if (value.trim()) hasData = true;
      }
      if (hasData) {
        data.push(rowRecord);
      }
    }
    return data;
  }, [cells, rowCount, colCount]);

  const pivotPreview = useMemo((): PivotTableResult | null => {
    if (!rowField || !valueField) return null;

    const effectiveColumnField = columnField && columnField !== '__none__' ? columnField : null;

    return buildPivotTable(sourceRows, columns, {
      rowField: rowField || null,
      columnField: effectiveColumnField,
      valueField: valueField || null,
      aggregation,
    });
  }, [sourceRows, columns, rowField, columnField, valueField, aggregation]);

  const handleCreate = useCallback(async () => {
    if (!rowField || !valueField) {
      setError('Please select Row and Value fields');
      return;
    }

    if (!pivotPreview || pivotPreview.body.length === 0) {
      setError('No data to create pivot table');
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      const sheetName = generatePivotSheetName(existingSheetNames);
      const operations = pivotResultToCellOperations(pivotPreview);

      await onCreatePivotSheet(sheetName, operations, {
        rowCount: pivotPreview.rowCount,
        colCount: pivotPreview.colCount,
      });

      setRowField('');
      setColumnField('__none__');
      setValueField('');
      setAggregation('SUM');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create pivot table');
    } finally {
      setIsCreating(false);
    }
  }, [rowField, valueField, pivotPreview, existingSheetNames, onCreatePivotSheet, onClose]);

  const resetForm = useCallback(() => {
    setRowField('');
    setColumnField('__none__');
    setValueField('');
    setAggregation('SUM');
    setError(null);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      <div className="relative h-full w-96 bg-white shadow-xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <Table2 className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-gray-900">Pivot Table Editor</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 border-b bg-blue-50/50">
            <div className="text-xs font-medium text-gray-500 mb-1">Source Data</div>
            <div className="text-sm font-medium text-gray-900">{sourceSheetName}</div>
            <div className="text-xs text-gray-500 mt-1">
              {sourceRows.length} rows × {columns.length} columns
            </div>
          </div>

          <div className="p-4 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Rows3 className="h-4 w-4 text-blue-600" />
                <label className="text-sm font-semibold text-gray-700">Rows</label>
              </div>
              <Select value={rowField} onValueChange={setRowField}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select field for rows" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col.index} value={col.header}>
                      {col.header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Values from this field will become row labels
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Columns3 className="h-4 w-4 text-purple-600" />
                <label className="text-sm font-semibold text-gray-700">Columns</label>
                <span className="text-xs text-gray-400">(optional)</span>
              </div>
              <Select value={columnField} onValueChange={setColumnField}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select field for columns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {columns
                    .filter((col) => col.header !== rowField)
                    .map((col) => (
                      <SelectItem key={col.index} value={col.header}>
                        {col.header}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Values from this field will become column headers
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-green-600" />
                <label className="text-sm font-semibold text-gray-700">Values</label>
              </div>
              <Select value={valueField} onValueChange={setValueField}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select field to aggregate" />
                </SelectTrigger>
                <SelectContent>
                  {columns
                    .filter((col) => col.header !== rowField && col.header !== columnField)
                    .map((col) => (
                      <SelectItem key={col.index} value={col.header}>
                        {col.header}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Numeric values from this field will be aggregated
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <ChevronDown className="h-4 w-4 text-orange-600" />
                <label className="text-sm font-semibold text-gray-700">Summarize by</label>
              </div>
              <Select value={aggregation} onValueChange={(v) => setAggregation(v as AggregationFunction)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGGREGATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {pivotPreview && pivotPreview.body.length > 0 && (
              <div className="pt-4 border-t">
                <div className="text-sm font-semibold text-gray-700 mb-2">Preview</div>
                <div className="text-xs text-gray-500 mb-2">
                  {pivotPreview.body.length} rows × {pivotPreview.headers.length} columns
                </div>
                <div className="max-h-48 overflow-auto rounded border bg-gray-50">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        {pivotPreview.headers.map((h, i) => (
                          <th
                            key={i}
                            className="px-2 py-1.5 text-left font-semibold text-gray-700 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pivotPreview.body.slice(0, 10).map((row, ri) => (
                        <tr key={ri} className="border-b last:border-b-0">
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className={`px-2 py-1 whitespace-nowrap ${
                                ci === 0 ? 'font-medium text-gray-900' : 'text-right text-gray-600 font-mono'
                              }`}
                            >
                              {typeof cell === 'number'
                                ? cell === 0
                                  ? ''
                                  : cell.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                : cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pivotPreview.body.length > 10 && (
                    <div className="px-2 py-1.5 text-center text-xs text-gray-500 bg-gray-100 border-t">
                      ... and {pivotPreview.body.length - 10} more rows
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="border-t bg-gray-50 p-4 space-y-2">
          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={!rowField || !valueField || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Table2 className="h-4 w-4 mr-2" />
                Create Pivot Table
              </>
            )}
          </Button>
          <Button variant="outline" className="w-full" onClick={resetForm} disabled={isCreating}>
            Reset
          </Button>
          <p className="text-xs text-gray-500 text-center">
            A new sheet will be created with the pivot results
          </p>
        </div>
      </div>
    </div>
  );
}
