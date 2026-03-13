'use client';

import { useState, useMemo } from 'react';
import { X, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { pivot, formatPivotValue, AggregationFunction, PivotResult } from '@/lib/spreadsheet/pivot';

interface CellData {
  rawInput: string;
  computedString?: string | null;
}

interface PivotPanelProps {
  cells: Map<string, CellData>;
  rowCount: number;
  colCount: number;
  onClose: () => void;
}

const AGGREGATION_OPTIONS: { value: AggregationFunction; label: string }[] = [
  { value: 'SUM', label: 'Sum' },
  { value: 'COUNT', label: 'Count' },
  { value: 'AVG', label: 'Average' },
];

function getCellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

export function PivotPanel({ cells, rowCount, colCount, onClose }: PivotPanelProps) {
  const [groupByCol, setGroupByCol] = useState<string>('');
  const [valueCol, setValueCol] = useState<string>('');
  const [aggFunction, setAggFunction] = useState<AggregationFunction>('SUM');

  const columns = useMemo(() => {
    const cols: { index: number; header: string }[] = [];
    for (let col = 0; col < colCount; col++) {
      const cellData = cells.get(getCellKey(0, col));
      const header = (cellData?.rawInput ?? '').trim();
      if (header) {
        cols.push({ index: col, header });
      }
    }
    return cols;
  }, [cells, colCount]);

  const rowData = useMemo(() => {
    const data: Array<Record<number, string>> = [];
    for (let row = 1; row < rowCount; row++) {
      const rowRecord: Record<number, string> = {};
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

  const pivotResults: PivotResult[] = useMemo(() => {
    if (!groupByCol || !valueCol) return [];
    const groupIdx = parseInt(groupByCol, 10);
    const valueIdx = parseInt(valueCol, 10);
    if (isNaN(groupIdx) || isNaN(valueIdx)) return [];
    return pivot(rowData, groupIdx, valueIdx, aggFunction);
  }, [rowData, groupByCol, valueCol, aggFunction]);

  const groupByHeader = columns.find((c) => c.index === parseInt(groupByCol, 10))?.header ?? 'Group';
  const valueHeader = columns.find((c) => c.index === parseInt(valueCol, 10))?.header ?? 'Value';

  return (
    <div className="border rounded-lg bg-background shadow-sm w-80">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Pivot Table</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3 space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Group By</label>
          <Select value={groupByCol} onValueChange={setGroupByCol}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col.index} value={String(col.index)}>
                  {col.header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Value</label>
          <Select value={valueCol} onValueChange={setValueCol}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col.index} value={String(col.index)}>
                  {col.header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Aggregation</label>
          <Select value={aggFunction} onValueChange={(v) => setAggFunction(v as AggregationFunction)}>
            <SelectTrigger className="h-8 text-sm">
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

        {pivotResults.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Results ({pivotResults.length} groups)
            </div>
            <div className="max-h-48 overflow-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="h-8 text-xs">{groupByHeader}</TableHead>
                    <TableHead className="h-8 text-xs text-right">
                      {aggFunction}({valueHeader})
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pivotResults.map((result) => (
                    <TableRow key={result.group}>
                      <TableCell className="py-1.5 text-sm">{result.group}</TableCell>
                      <TableCell className="py-1.5 text-sm text-right font-mono">
                        {formatPivotValue(result.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {groupByCol && valueCol && pivotResults.length === 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center py-2">
              No data to display
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
