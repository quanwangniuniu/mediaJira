'use client';

import { useCallback } from 'react';
import { X, Table2, Plus, Trash2, Rows3, Columns3, Calculator, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PivotConfig,
  PivotValueConfig,
  AggregationFunction,
  SourceColumn,
} from '@/lib/spreadsheet/pivot';

interface PivotEditorPanelProps {
  config: PivotConfig;
  sourceSheetName: string;
  sourceColumns: SourceColumn[];
  sourceRowCount: number;
  onConfigChange: (config: PivotConfig) => void;
  onClose: () => void;
  onRefresh: () => void;
}

const AGGREGATION_OPTIONS: { value: AggregationFunction; label: string }[] = [
  { value: 'SUM', label: 'SUM' },
  { value: 'COUNT', label: 'COUNT' },
  { value: 'AVG', label: 'AVG' },
];

export function PivotEditorPanel({
  config,
  sourceSheetName,
  sourceColumns,
  sourceRowCount,
  onConfigChange,
  onClose,
  onRefresh,
}: PivotEditorPanelProps) {
  const usedFields = new Set([...config.rows, ...config.columns, ...config.values.map((v) => v.field)]);

  const availableFieldsForRows = sourceColumns.filter(
    (col) => !config.columns.includes(col.header) && !config.values.some((v) => v.field === col.header)
  );

  const availableFieldsForColumns = sourceColumns.filter(
    (col) => !config.rows.includes(col.header) && !config.values.some((v) => v.field === col.header)
  );

  const availableFieldsForValues = sourceColumns.filter(
    (col) => !config.rows.includes(col.header) && !config.columns.includes(col.header)
  );

  const handleAddRow = useCallback(
    (field: string) => {
      if (!field || field === '__add__') return;
      onConfigChange({
        ...config,
        rows: [...config.rows, field],
      });
    },
    [config, onConfigChange]
  );

  const handleRemoveRow = useCallback(
    (index: number) => {
      onConfigChange({
        ...config,
        rows: config.rows.filter((_, i) => i !== index),
      });
    },
    [config, onConfigChange]
  );

  const handleAddColumn = useCallback(
    (field: string) => {
      if (!field || field === '__add__') return;
      onConfigChange({
        ...config,
        columns: [...config.columns, field],
      });
    },
    [config, onConfigChange]
  );

  const handleRemoveColumn = useCallback(
    (index: number) => {
      onConfigChange({
        ...config,
        columns: config.columns.filter((_, i) => i !== index),
      });
    },
    [config, onConfigChange]
  );

  const handleAddValue = useCallback(
    (field: string) => {
      if (!field || field === '__add__') return;
      onConfigChange({
        ...config,
        values: [...config.values, { field, aggregation: 'SUM' }],
      });
    },
    [config, onConfigChange]
  );

  const handleRemoveValue = useCallback(
    (index: number) => {
      onConfigChange({
        ...config,
        values: config.values.filter((_, i) => i !== index),
      });
    },
    [config, onConfigChange]
  );

  const handleValueAggregationChange = useCallback(
    (index: number, aggregation: AggregationFunction) => {
      const newValues = [...config.values];
      newValues[index] = { ...newValues[index], aggregation };
      onConfigChange({
        ...config,
        values: newValues,
      });
    },
    [config, onConfigChange]
  );

  return (
    <div className="w-80 h-full bg-white border-l border-gray-200 flex flex-col shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-green-50 to-blue-50">
        <div className="flex items-center gap-2">
          <Table2 className="h-5 w-5 text-green-600" />
          <span className="font-semibold text-gray-900">Pivot Table Editor</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRefresh}
            title="Refresh pivot table"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 border-b bg-gray-50">
          <div className="text-xs font-medium text-gray-500 mb-0.5">Source Data</div>
          <div className="text-sm font-medium text-gray-900">{sourceSheetName}</div>
          <div className="text-xs text-gray-500">
            {sourceRowCount} rows × {sourceColumns.length} columns
          </div>
        </div>

        <div className="p-3 space-y-4">
          {/* Rows Section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Rows3 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-700">Rows</span>
            </div>
            <div className="space-y-1.5">
              {config.rows.map((field, index) => (
                <div
                  key={`row-${index}`}
                  className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-100"
                >
                  <span className="flex-1 text-sm text-gray-800 truncate">{field}</span>
                  <button
                    onClick={() => handleRemoveRow(index)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Select value="__add__" onValueChange={handleAddRow}>
                <SelectTrigger className="w-full h-8 text-sm border-dashed">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add row field</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {availableFieldsForRows
                    .filter((col) => !config.rows.includes(col.header))
                    .map((col) => (
                      <SelectItem key={col.index} value={col.header}>
                        {col.header}
                      </SelectItem>
                    ))}
                  {availableFieldsForRows.filter((col) => !config.rows.includes(col.header)).length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-gray-500">No fields available</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Columns Section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Columns3 className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-semibold text-gray-700">Columns</span>
              <span className="text-xs text-gray-400">(optional)</span>
            </div>
            <div className="space-y-1.5">
              {config.columns.map((field, index) => (
                <div
                  key={`col-${index}`}
                  className="flex items-center gap-2 p-2 bg-purple-50 rounded border border-purple-100"
                >
                  <span className="flex-1 text-sm text-gray-800 truncate">{field}</span>
                  <button
                    onClick={() => handleRemoveColumn(index)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Select value="__add__" onValueChange={handleAddColumn}>
                <SelectTrigger className="w-full h-8 text-sm border-dashed">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add column field</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {availableFieldsForColumns
                    .filter((col) => !config.columns.includes(col.header))
                    .map((col) => (
                      <SelectItem key={col.index} value={col.header}>
                        {col.header}
                      </SelectItem>
                    ))}
                  {availableFieldsForColumns.filter((col) => !config.columns.includes(col.header)).length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-gray-500">No fields available</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Values Section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-gray-700">Values</span>
            </div>
            <div className="space-y-1.5">
              {config.values.map((valueConfig, index) => (
                <div
                  key={`val-${index}`}
                  className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-100"
                >
                  <Select
                    value={valueConfig.aggregation}
                    onValueChange={(v) => handleValueAggregationChange(index, v as AggregationFunction)}
                  >
                    <SelectTrigger className="w-20 h-7 text-xs">
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
                  <span className="flex-1 text-sm text-gray-800 truncate">of {valueConfig.field}</span>
                  <button
                    onClick={() => handleRemoveValue(index)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Select value="__add__" onValueChange={handleAddValue}>
                <SelectTrigger className="w-full h-8 text-sm border-dashed">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add value field</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {availableFieldsForValues
                    .filter((col) => !config.values.some((v) => v.field === col.header))
                    .map((col) => (
                      <SelectItem key={col.index} value={col.header}>
                        {col.header}
                      </SelectItem>
                    ))}
                  {availableFieldsForValues.filter((col) => !config.values.some((v) => v.field === col.header)).length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-gray-500">No fields available</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t bg-gray-50 p-3">
        <div className="text-xs text-gray-500 text-center">
          {config.rows.length === 0 && config.values.length === 0 ? (
            <span className="text-amber-600">Add at least one row and one value field</span>
          ) : config.rows.length === 0 ? (
            <span className="text-amber-600">Add at least one row field</span>
          ) : config.values.length === 0 ? (
            <span className="text-amber-600">Add at least one value field</span>
          ) : (
            <span className="text-green-600">Pivot table will update automatically</span>
          )}
        </div>
      </div>
    </div>
  );
}
