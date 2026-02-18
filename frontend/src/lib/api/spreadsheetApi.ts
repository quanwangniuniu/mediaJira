import api from '../api';
import {
  SpreadsheetData,
  SpreadsheetListResponse,
  CreateSpreadsheetRequest,
  UpdateSpreadsheetRequest,
  SheetData,
  SheetListResponse,
  CreateSheetRequest,
  UpdateSheetRequest,
} from '@/types/spreadsheet';

/** Timeout for long-running spreadsheet requests (import batch, large range read). Default axios 10s is too short. */
const SPREADSHEET_LONG_REQUEST_TIMEOUT_MS = 120000; // 2 minutes

export const SpreadsheetAPI = {
  // List spreadsheets for a project
  listSpreadsheets: async (
    projectId: number,
    params?: {
      page?: number;
      page_size?: number;
      search?: string;
      order_by?: 'name' | 'created_at' | 'updated_at';
    }
  ): Promise<SpreadsheetListResponse> => {
    const queryParams: any = {
      project_id: projectId,
      ...params,
    };
    const response = await api.get<SpreadsheetListResponse>('/api/spreadsheet/spreadsheets/', {
      params: queryParams,
    });
    return response.data;
  },

  // Get a specific spreadsheet by ID
  getSpreadsheet: async (spreadsheetId: number): Promise<SpreadsheetData> => {
    const response = await api.get<SpreadsheetData>(`/api/spreadsheet/spreadsheets/${spreadsheetId}/`);
    return response.data;
  },

  // Create a new spreadsheet
  createSpreadsheet: async (
    projectId: number,
    data: CreateSpreadsheetRequest
  ): Promise<SpreadsheetData> => {
    const response = await api.post<SpreadsheetData>(
      `/api/spreadsheet/spreadsheets/?project_id=${projectId}`,
      data
    );
    return response.data;
  },

  // Update a spreadsheet
  updateSpreadsheet: async (
    spreadsheetId: number,
    data: UpdateSpreadsheetRequest
  ): Promise<SpreadsheetData> => {
    const response = await api.put<SpreadsheetData>(
      `/api/spreadsheet/spreadsheets/${spreadsheetId}/`,
      data
    );
    return response.data;
  },

  // Delete a spreadsheet (soft delete)
  deleteSpreadsheet: async (spreadsheetId: number): Promise<void> => {
    await api.delete(`/api/spreadsheet/spreadsheets/${spreadsheetId}/`);
  },

  // Sheet operations
  // List sheets for a spreadsheet
  listSheets: async (
    spreadsheetId: number,
    params?: {
      page?: number;
      page_size?: number;
      order_by?: 'name' | 'position' | 'created_at';
    }
  ): Promise<SheetListResponse> => {
    const queryParams: any = {
      ...params,
    };
    const response = await api.get<SheetListResponse>(
      `/api/spreadsheet/spreadsheets/${spreadsheetId}/sheets/`,
      { params: queryParams }
    );
    return response.data;
  },

  // Get a specific sheet by ID
  getSheet: async (spreadsheetId: number, sheetId: number): Promise<SheetData> => {
    const response = await api.get<SheetData>(
      `/api/spreadsheet/spreadsheets/${spreadsheetId}/sheets/${sheetId}/`
    );
    return response.data;
  },

  // Create a new sheet
  createSheet: async (
    spreadsheetId: number,
    data: CreateSheetRequest
  ): Promise<SheetData> => {
    const response = await api.post<SheetData>(
      `/api/spreadsheet/spreadsheets/${spreadsheetId}/sheets/`,
      data
    );
    return response.data;
  },

  // Update a sheet
  updateSheet: async (
    spreadsheetId: number,
    sheetId: number,
    data: UpdateSheetRequest
  ): Promise<SheetData> => {
    const response = await api.put<SheetData>(
      `/api/spreadsheet/spreadsheets/${spreadsheetId}/sheets/${sheetId}/`,
      data
    );
    return response.data;
  },

  // Delete a sheet (soft delete) via project-scoped endpoint
  deleteSheet: async (projectId: number, spreadsheetId: number, sheetId: number): Promise<void> => {
    await api.delete(
      `/api/projects/${projectId}/spreadsheets/${spreadsheetId}/sheets/${sheetId}/`
    );
  },

  // Cell operations
  // Read cells in a range
  readCellRange: async (
    spreadsheetId: number,
    sheetId: number,
    startRow: number,
    endRow: number,
    startColumn: number,
    endColumn: number
  ): Promise<{
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
    /** Full sheet dimensions (use for grid size). When present, prefer over row_count/column_count which are the requested range size. */
    sheet_row_count?: number | null;
    sheet_column_count?: number | null;
  }> => {
    const response = await api.post<{
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
    }>(
      `/api/spreadsheet/spreadsheets/${spreadsheetId}/sheets/${sheetId}/cells/range/`,
      {
        start_row: startRow,
        end_row: endRow,
        start_column: startColumn,
        end_column: endColumn,
      },
      { timeout: SPREADSHEET_LONG_REQUEST_TIMEOUT_MS }
    );
    return response.data;
  },

  // Batch update cells
  batchUpdateCells: async (
    spreadsheetId: number,
    sheetId: number,
    operations: Array<{
      operation: 'set' | 'clear';
      row: number;
      column: number;
      raw_input?: string | null;
      value_type?: string;
      string_value?: string | null;
      number_value?: number | null;
      boolean_value?: boolean | null;
      formula_value?: string | null;
    }>,
    autoExpand: boolean = true
  ): Promise<{
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
  }> => {
    const response = await api.post(
      `/api/spreadsheet/spreadsheets/${spreadsheetId}/sheets/${sheetId}/cells/batch/`,
      {
        operations,
        auto_expand: autoExpand,
      },
      { timeout: SPREADSHEET_LONG_REQUEST_TIMEOUT_MS }
    );
    return response.data;
  },

  // Highlights
  getHighlights: async (
    spreadsheetId: number,
    sheetId: number
  ): Promise<{
    highlights: Array<{
      id: number;
      scope: 'CELL' | 'ROW' | 'COLUMN';
      row_index: number | null;
      col_index: number | null;
      color: string;
      created_at: string;
      updated_at: string;
    }>;
  }> => {
    const response = await api.get(
      `/api/spreadsheet/spreadsheets/${spreadsheetId}/sheets/${sheetId}/highlights/`
    );
    return response.data;
  },

  batchUpdateHighlights: async (
    spreadsheetId: number,
    sheetId: number,
    ops: Array<{
      scope: 'CELL' | 'ROW' | 'COLUMN';
      row?: number;
      col?: number;
      color?: string;
      operation: 'SET' | 'CLEAR';
    }>
  ): Promise<{ updated: number; deleted: number }> => {
    const response = await api.post(
      `/api/spreadsheet/spreadsheets/${spreadsheetId}/sheets/${sheetId}/highlights/batch/`,
      { ops }
    );
    return response.data;
  },

  // Resize sheet (ensure minimum dimensions)
  resizeSheet: async (
    spreadsheetId: number,
    sheetId: number,
    rowCount: number,
    columnCount: number
  ): Promise<{
    rows_created: number;
    columns_created: number;
    total_rows: number;
    total_columns: number;
  }> => {
    const response = await api.post(
      `/api/spreadsheet/spreadsheets/${spreadsheetId}/sheets/${sheetId}/resize/`,
      {
        row_count: rowCount,
        column_count: columnCount,
      }
    );
    return response.data;
  },

  // Insert rows
  insertRows: async (
    spreadsheetId: number,
    sheetId: number,
    position: number,
    count: number = 1
  ): Promise<{
    rows_created: number;
    total_rows: number;
    operation_id: number;
  }> => {
    const response = await api.post(
      `/api/spreadsheet/spreadsheets/${spreadsheetId}/sheets/${sheetId}/rows/insert/`,
      {
        position,
        count,
      }
    );
    return response.data;
  },

  // Insert columns
  insertColumns: async (
    spreadsheetId: number,
    sheetId: number,
    position: number,
    count: number = 1
  ): Promise<{
    columns_created: number;
    total_columns: number;
    operation_id: number;
  }> => {
    const response = await api.post(
      `/api/spreadsheet/spreadsheets/${spreadsheetId}/sheets/${sheetId}/columns/insert/`,
      {
        position,
        count,
      }
    );
    return response.data;
  },

  // Delete rows
  deleteRows: async (
    spreadsheetId: number,
    sheetId: number,
    position: number,
    count: number = 1
  ): Promise<{
    rows_deleted: number;
    total_rows: number;
    operation_id: number;
  }> => {
    const response = await api.post(
      `/api/spreadsheet/spreadsheets/${spreadsheetId}/sheets/${sheetId}/rows/delete/`,
      {
        position,
        count,
      }
    );
    return response.data;
  },

  // Delete columns
  deleteColumns: async (
    spreadsheetId: number,
    sheetId: number,
    position: number,
    count: number = 1
  ): Promise<{
    columns_deleted: number;
    total_columns: number;
    operation_id: number;
  }> => {
    const response = await api.post(
      `/api/spreadsheet/spreadsheets/${spreadsheetId}/sheets/${sheetId}/columns/delete/`,
      {
        position,
        count,
      }
    );
    return response.data;
  },

  // Revert structure operation
  revertStructureOperation: async (
    spreadsheetId: number,
    sheetId: number,
    operationId: number
  ): Promise<{ operation_id: number; is_reverted: boolean }> => {
    const response = await api.post(
      `/api/spreadsheet/spreadsheets/${spreadsheetId}/sheets/${sheetId}/operations/${operationId}/revert/`,
      {}
    );
    return response.data;
  },
};

