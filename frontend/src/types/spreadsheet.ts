// Type definitions for Spreadsheet feature

export interface SpreadsheetData {
  id: number;
  project: number;
  name: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface SpreadsheetListResponse {
  count: number;
  page: number;
  page_size: number;
  results: SpreadsheetData[];
}

export interface CreateSpreadsheetRequest {
  name: string;
}

export interface UpdateSpreadsheetRequest {
  name: string;
}

export interface SheetData {
  id: number;
  spreadsheet: number;
  name: string;
  position: number;
  frozen_row_count?: number;
  frozen_column_count?: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface SheetListResponse {
  count: number;
  page: number;
  page_size: number;
  results: SheetData[];
}

export interface CreateSheetRequest {
  name: string;
}

export interface UpdateSheetRequest {
  name?: string;
  frozen_row_count?: number;
  frozen_column_count?: number;
}

