/**
 * Storybook mock for spreadsheet API. Same interface as real API, returns mock data.
 */
import type {
  SpreadsheetData,
  SpreadsheetListResponse,
  CreateSpreadsheetRequest,
  UpdateSpreadsheetRequest,
  SheetData,
  SheetListResponse,
  CreateSheetRequest,
  UpdateSheetRequest,
} from '@/types/spreadsheet';

const mockSpreadsheet: SpreadsheetData = {
  id: 1,
  project: 1,
  name: 'Mock Spreadsheet',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_deleted: false,
};

const mockSheet: SheetData = {
  id: 1,
  spreadsheet: 1,
  name: 'Sheet1',
  position: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_deleted: false,
};

export const SpreadsheetAPI = {
  listSpreadsheets: async (): Promise<SpreadsheetListResponse> =>
    Promise.resolve({
      count: 1,
      page: 1,
      page_size: 2,
      results: [mockSpreadsheet],
    }),

  getSpreadsheet: async (): Promise<SpreadsheetData> => Promise.resolve(mockSpreadsheet),

  createSpreadsheet: async (
    _projectId: number,
    data: CreateSpreadsheetRequest
  ): Promise<SpreadsheetData> =>
    Promise.resolve({
      ...mockSpreadsheet,
      id: 2,
      name: data.name,
    }),

  updateSpreadsheet: async (
    _spreadsheetId: number,
    data: UpdateSpreadsheetRequest
  ): Promise<SpreadsheetData> =>
    Promise.resolve({
      ...mockSpreadsheet,
      name: data.name,
    }),

  deleteSpreadsheet: async (): Promise<void> => Promise.resolve(),

  listSheets: async (): Promise<SheetListResponse> =>
    Promise.resolve({
      count: 1,
      page: 1,
      page_size: 2,
      results: [mockSheet],
    }),

  getSheet: async (): Promise<SheetData> => Promise.resolve(mockSheet),

  createSheet: async (
    _spreadsheetId: number,
    data: CreateSheetRequest
  ): Promise<SheetData> =>
    Promise.resolve({
      ...mockSheet,
      id: 2,
      name: data.name,
    }),

  updateSheet: async (
    _spreadsheetId: number,
    _sheetId: number,
    data: UpdateSheetRequest
  ): Promise<SheetData> =>
    Promise.resolve({
      ...mockSheet,
      name: data.name,
    }),

  deleteSheet: async (): Promise<void> => Promise.resolve(),

  readCellRange: async (): Promise<{
    cells: Array<{
      id: number;
      row_position: number;
      column_position: number;
      value_type: string;
      string_value?: string | null;
      number_value?: number | null;
      boolean_value?: boolean | null;
      formula_value?: string | null;
      raw_input?: string | null;
      computed_type?: string | null;
      computed_number?: number | string | null;
      computed_string?: string | null;
      error_code?: string | null;
    }>;
    row_count: number;
    column_count: number;
    sheet_row_count?: number | null;
    sheet_column_count?: number | null;
  }> =>
    Promise.resolve({
      cells: [],
      row_count: 100,
      column_count: 26,
      sheet_row_count: 100,
      sheet_column_count: 26,
    }),

  batchUpdateCells: async (): Promise<{
    updated: number;
    cleared: number;
    rows_expanded: number;
    columns_expanded: number;
    cells?: Array<{
      id: number;
      row_position: number;
      column_position: number;
      value_type: string;
      string_value?: string | null;
      number_value?: number | null;
      boolean_value?: boolean | null;
      formula_value?: string | null;
      raw_input?: string | null;
      computed_type?: string | null;
      computed_number?: number | string | null;
      computed_string?: string | null;
      error_code?: string | null;
    }>;
  }> =>
    Promise.resolve({
      updated: 0,
      cleared: 0,
      rows_expanded: 0,
      columns_expanded: 0,
    }),

  finalizeImport: async (): Promise<{ status: string }> =>
    Promise.resolve({ status: 'ok' }),

  getHighlights: async (): Promise<{
    highlights: Array<{
      id: number;
      scope: 'CELL' | 'ROW' | 'COLUMN';
      row_index: number | null;
      col_index: number | null;
      color: string;
      created_at: string;
      updated_at: string;
    }>;
  }> => Promise.resolve({ highlights: [] }),

  batchUpdateHighlights: async (): Promise<{ updated: number; deleted: number }> =>
    Promise.resolve({ updated: 0, deleted: 0 }),

  resizeSheet: async (): Promise<{
    rows_created: number;
    columns_created: number;
    total_rows: number;
    total_columns: number;
  }> =>
    Promise.resolve({
      rows_created: 0,
      columns_created: 0,
      total_rows: 100,
      total_columns: 26,
    }),

  insertRows: async (): Promise<{
    rows_created: number;
    total_rows: number;
    operation_id: number;
  }> =>
    Promise.resolve({
      rows_created: 1,
      total_rows: 101,
      operation_id: 1,
    }),

  insertColumns: async (): Promise<{
    columns_created: number;
    total_columns: number;
    operation_id: number;
  }> =>
    Promise.resolve({
      columns_created: 1,
      total_columns: 27,
      operation_id: 1,
    }),

  deleteRows: async (): Promise<{
    rows_deleted: number;
    total_rows: number;
    operation_id: number;
  }> =>
    Promise.resolve({
      rows_deleted: 1,
      total_rows: 99,
      operation_id: 1,
    }),

  deleteColumns: async (): Promise<{
    columns_deleted: number;
    total_columns: number;
    operation_id: number;
  }> =>
    Promise.resolve({
      columns_deleted: 1,
      total_columns: 25,
      operation_id: 1,
    }),

  revertStructureOperation: async (): Promise<{
    operation_id: number;
    is_reverted: boolean;
  }> => Promise.resolve({ operation_id: 1, is_reverted: true }),
};
