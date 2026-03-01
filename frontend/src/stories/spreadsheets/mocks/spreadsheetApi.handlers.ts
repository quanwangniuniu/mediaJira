/**
 * MSW handlers for spreadsheet API. Intercepts HTTP requests so Storybook
 * doesn't hit the real backend. No changes to SpreadsheetGrid required.
 *
 * Uses RegExp predicates to match regardless of origin (Storybook iframe vs manager).
 * Maintains cell state per sheet so insert/delete column operations preserve data.
 */
import { http, HttpResponse } from 'msw';

type CellData = {
  row_position: number;
  column_position: number;
  raw_input: string | null;
  computed_type: string;
  computed_string: string | null;
};

const cellStore = new Map<string, Map<string, CellData>>();
const colCountBySheet = new Map<string, number>();

function getSheetId(url: string): string {
  const m = url.match(/\/sheets\/(\d+)\//);
  return m ? m[1] : 'default';
}

function getCellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

const batchUpdateCellsResponse = {
  updated: 0,
  cleared: 0,
  rows_expanded: 0,
  columns_expanded: 0,
};

/** Match /api/spreadsheet/spreadsheets/:id/sheets/:id/... regardless of origin */
const spreadsheetPath = (path: string) =>
  new RegExp(`^https?://[^/]+/api/spreadsheet/spreadsheets/\\d+/sheets/\\d+${path}(\\?.*)?$`);

export const spreadsheetHandlers = [
  http.post(spreadsheetPath('/cells/range/'), async ({ request }) => {
    const sheetId = getSheetId(request.url);
    const body = (await request.json()) as {
      start_row?: number;
      end_row?: number;
      start_column?: number;
      end_column?: number;
    };
    const startRow = body?.start_row ?? 0;
    const endRow = body?.end_row ?? 99;
    const startCol = body?.start_column ?? 0;
    const endCol = body?.end_column ?? 25;
    const store = cellStore.get(sheetId);
    const cells: Array<CellData & { id?: number }> = [];
    if (store) {
      store.forEach((cell) => {
        if (
          cell.row_position >= startRow &&
          cell.row_position <= endRow &&
          cell.column_position >= startCol &&
          cell.column_position <= endCol
        ) {
          cells.push({ ...cell, id: cells.length });
        }
      });
    }
    const cols = colCountBySheet.get(sheetId) ?? 26;
    return HttpResponse.json({
      cells,
      row_count: 100,
      column_count: cols,
      sheet_row_count: 100,
      sheet_column_count: cols,
    });
  }),
  http.post(spreadsheetPath('/cells/batch/?'), async ({ request }) => {
    const sheetId = getSheetId(request.url);
    const body = (await request.json()) as {
      operations?: Array<{ operation?: string; row: number; column: number; raw_input?: string }>;
    };
    const ops = body?.operations ?? [];
    const cells: CellData[] = [];
    let store = cellStore.get(sheetId);
    if (!store) {
      store = new Map();
      cellStore.set(sheetId, store);
    }
    ops.forEach((op) => {
      const key = getCellKey(op.row, op.column);
      if (op.operation === 'clear') {
        store!.delete(key);
      } else {
        const cell: CellData = {
          row_position: op.row,
          column_position: op.column,
          raw_input: op.raw_input ?? null,
          computed_type: 'string',
          computed_string: op.raw_input ?? null,
        };
        store!.set(key, cell);
        cells.push(cell);
      }
    });
    return HttpResponse.json({
      ...batchUpdateCellsResponse,
      updated: cells.length,
      cells,
    });
  }),
  http.post(spreadsheetPath('/cells/import-finalize/?'), () =>
    HttpResponse.json({ status: 'ok' })
  ),
  http.get(spreadsheetPath('/highlights/?'), () =>
    HttpResponse.json({ highlights: [] })
  ),
  http.post(spreadsheetPath('/highlights/batch/?'), () =>
    HttpResponse.json({ updated: 0, deleted: 0 })
  ),
  http.get(spreadsheetPath('/cell-formats/?'), () =>
    HttpResponse.json({ formats: [] })
  ),
  http.post(spreadsheetPath('/cell-formats/batch/?'), () =>
    HttpResponse.json({ updated: 0 })
  ),
  http.post(spreadsheetPath('/resize/?'), () =>
    HttpResponse.json({
      rows_created: 0,
      columns_created: 0,
      total_rows: 100,
      total_columns: 26,
    })
  ),
  http.post(spreadsheetPath('/rows/insert/?'), () =>
    HttpResponse.json({ rows_created: 1, total_rows: 101, operation_id: 1 })
  ),
  http.post(spreadsheetPath('/columns/insert/?'), async ({ request }) => {
    const sheetId = getSheetId(request.url);
    const body = (await request.json()) as { position: number; count: number };
    const position = body?.position ?? 0;
    const count = body?.count ?? 1;
    const store = cellStore.get(sheetId);
    if (store) {
      const toShift: Array<[string, CellData]> = [];
      store.forEach((cell, key) => {
        if (cell.column_position >= position) {
          toShift.push([key, cell]);
        }
      });
      toShift.forEach(([key]) => store.delete(key));
      toShift.forEach(([, cell]) => {
        const newCol = cell.column_position + count;
        store.set(getCellKey(cell.row_position, newCol), {
          ...cell,
          column_position: newCol,
        });
      });
    }
    const prevCols = colCountBySheet.get(sheetId) ?? 26;
    const nextCols = prevCols + count;
    colCountBySheet.set(sheetId, nextCols);
    return HttpResponse.json({ columns_created: count, total_columns: nextCols, operation_id: 1 });
  }),
  http.post(spreadsheetPath('/rows/delete/?'), () =>
    HttpResponse.json({ rows_deleted: 1, total_rows: 99, operation_id: 1 })
  ),
  http.post(spreadsheetPath('/columns/delete/?'), async ({ request }) => {
    const sheetId = getSheetId(request.url);
    const body = (await request.json()) as { position: number; count: number };
    const position = body?.position ?? 0;
    const count = body?.count ?? 1;
    const store = cellStore.get(sheetId);
    if (store) {
      const toShift: Array<[string, CellData]> = [];
      store.forEach((cell, key) => {
        if (cell.column_position >= position && cell.column_position < position + count) {
          store.delete(key);
        } else if (cell.column_position >= position + count) {
          toShift.push([key, cell]);
        }
      });
      toShift.forEach(([key]) => store.delete(key));
      toShift.forEach(([, cell]) => {
        const newCol = cell.column_position - count;
        store.set(getCellKey(cell.row_position, newCol), {
          ...cell,
          column_position: newCol,
        });
      });
    }
    const prevCols = colCountBySheet.get(sheetId) ?? 26;
    const nextCols = Math.max(0, prevCols - count);
    colCountBySheet.set(sheetId, nextCols);
    return HttpResponse.json({ columns_deleted: count, total_columns: nextCols, operation_id: 1 });
  }),
  http.post(spreadsheetPath('/operations/\\d+/revert/?'), () =>
    HttpResponse.json({ operation_id: 1, is_reverted: true })
  ),
];
