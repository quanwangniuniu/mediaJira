/**
 * MSW handlers for spreadsheet API. Intercepts HTTP requests so Storybook
 * doesn't hit the real backend. No changes to SpreadsheetGrid required.
 */
import { http, HttpResponse } from 'msw';

const readCellRangeResponse = {
  cells: [],
  row_count: 100,
  column_count: 26,
  sheet_row_count: 100,
  sheet_column_count: 26,
};

const batchUpdateCellsResponse = {
  updated: 0,
  cleared: 0,
  rows_expanded: 0,
  columns_expanded: 0,
};

export const spreadsheetHandlers = [
  http.get('/api/spreadsheet/spreadsheets/:spreadsheetId/sheets/:sheetId/cells/range/', () =>
    HttpResponse.json(readCellRangeResponse)
  ),
  http.post('/api/spreadsheet/spreadsheets/:spreadsheetId/sheets/:sheetId/cells/batch/', () =>
    HttpResponse.json(batchUpdateCellsResponse)
  ),
  http.post('/api/spreadsheet/spreadsheets/:spreadsheetId/sheets/:sheetId/cells/import-finalize/', () =>
    HttpResponse.json({ status: 'ok' })
  ),
  http.get('/api/spreadsheet/spreadsheets/:spreadsheetId/sheets/:sheetId/highlights/', () =>
    HttpResponse.json({ highlights: [] })
  ),
  http.post('/api/spreadsheet/spreadsheets/:spreadsheetId/sheets/:sheetId/highlights/batch/', () =>
    HttpResponse.json({ updated: 0, deleted: 0 })
  ),
  http.get('/api/spreadsheet/spreadsheets/:spreadsheetId/sheets/:sheetId/cell-formats/', () =>
    HttpResponse.json({ formats: [] })
  ),
  http.post('/api/spreadsheet/spreadsheets/:spreadsheetId/sheets/:sheetId/cell-formats/batch/', () =>
    HttpResponse.json({ updated: 0 })
  ),
  http.post('/api/spreadsheet/spreadsheets/:spreadsheetId/sheets/:sheetId/resize/', () =>
    HttpResponse.json({
      rows_created: 0,
      columns_created: 0,
      total_rows: 100,
      total_columns: 26,
    })
  ),
  http.post('/api/spreadsheet/spreadsheets/:spreadsheetId/sheets/:sheetId/rows/insert/', () =>
    HttpResponse.json({ rows_created: 1, total_rows: 101, operation_id: 1 })
  ),
  http.post('/api/spreadsheet/spreadsheets/:spreadsheetId/sheets/:sheetId/columns/insert/', () =>
    HttpResponse.json({ columns_created: 1, total_columns: 27, operation_id: 1 })
  ),
  http.post('/api/spreadsheet/spreadsheets/:spreadsheetId/sheets/:sheetId/rows/delete/', () =>
    HttpResponse.json({ rows_deleted: 1, total_rows: 99, operation_id: 1 })
  ),
  http.post('/api/spreadsheet/spreadsheets/:spreadsheetId/sheets/:sheetId/columns/delete/', () =>
    HttpResponse.json({ columns_deleted: 1, total_columns: 25, operation_id: 1 })
  ),
  http.post(
    '/api/spreadsheet/spreadsheets/:spreadsheetId/sheets/:sheetId/operations/:operationId/revert/',
    () => HttpResponse.json({ operation_id: 1, is_reverted: true })
  ),
];
