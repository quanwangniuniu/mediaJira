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
  }> => {
    const response = await api.post(
      `/api/spreadsheet/spreadsheets/${spreadsheetId}/sheets/${sheetId}/cells/range/`,
      {
        start_row: startRow,
        end_row: endRow,
        start_column: startColumn,
        end_column: endColumn,
      }
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
  }> => {
    const response = await api.post(
      `/api/spreadsheet/spreadsheets/${spreadsheetId}/sheets/${sheetId}/cells/batch/`,
      {
        operations,
        auto_expand: autoExpand,
      }
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
};

