export type PatternStepType =
  | 'APPLY_FORMULA'
  | 'INSERT_ROW'
  | 'INSERT_COLUMN'
  | 'DELETE_COLUMN'
  | 'FILL_SERIES'
  | 'SET_COLUMN_NAME'
  | 'APPLY_HIGHLIGHT'
  | 'GROUP';

export type InsertRowParams = {
  index: number;
  position: 'above' | 'below';
};

export type InsertColumnParams = {
  index: number;
  position: 'left' | 'right';
};

export type DeleteColumnParams = {
  index: number;
};

export type FillSeriesParams = {
  source: {
    row: number;
    col: number;
  };
  range: {
    start_row: number;
    end_row: number;
    start_col: number;
    end_col: number;
  };
};

export type SetColumnNameParams = {
  header_row_index: number;
  from_header: string | null;
  to_header: string;
  column_ref: {
    index: number;
  };
  column_locator: {
    strategy: 'BY_HEADER_TEXT';
    from_header: string | null;
    fallback_index: number;
  };
};

export type ApplyHighlightParams = {
  color: string;
  scope: 'CELL' | 'ROW' | 'COLUMN' | 'RANGE';
  header_row_index: number;
  target: {
    by_header?: string | null;
    row_key?: any;
    fallback?: {
      row_index?: number;
      col_index?: number;
      start_row?: number;
      end_row?: number;
      start_col?: number;
      end_col?: number;
    };
    by_headers?: { start?: string | null; end?: string | null };
  };
};

export interface ApplyFormulaStep {
  id: string;
  type: 'APPLY_FORMULA';
  target: {
    row: number;
    col: number;
  };
  a1: string;
  formula: string;
  disabled: boolean;
  createdAt: string;
}

export interface InsertRowStep {
  id: string;
  type: 'INSERT_ROW';
  params: InsertRowParams;
  disabled: boolean;
  createdAt: string;
}

export interface InsertColumnStep {
  id: string;
  type: 'INSERT_COLUMN';
  params: InsertColumnParams;
  disabled: boolean;
  createdAt: string;
}

export interface DeleteColumnStep {
  id: string;
  type: 'DELETE_COLUMN';
  params: DeleteColumnParams;
  disabled: boolean;
  createdAt: string;
}

export interface FillSeriesStep {
  id: string;
  type: 'FILL_SERIES';
  params: FillSeriesParams;
  disabled: boolean;
  createdAt: string;
}

export interface SetColumnNameStep {
  id: string;
  type: 'SET_COLUMN_NAME';
  params: SetColumnNameParams;
  disabled: boolean;
  createdAt: string;
}

export interface ApplyHighlightStep {
  id: string;
  type: 'APPLY_HIGHLIGHT';
  params: ApplyHighlightParams;
  disabled: boolean;
  createdAt: string;
}

export type PatternStep =
  | ApplyFormulaStep
  | InsertRowStep
  | InsertColumnStep
  | DeleteColumnStep
  | FillSeriesStep
  | SetColumnNameStep
  | ApplyHighlightStep;

/** Single operation (same as PatternStep); alias for timeline usage. */
export type Operation = PatternStep;

/** Group of operations shown as one atomic unit in the timeline. */
export interface OperationGroup {
  id: string;
  type: 'GROUP';
  name: string;
  items: PatternStep[];
  collapsed: boolean;
  createdAt: string;
}

/** Timeline entry: either a single operation or a group. */
export type TimelineItem = Operation | OperationGroup;

export function isOperationGroup(item: TimelineItem): item is OperationGroup {
  return item.type === 'GROUP';
}

/** Flatten timeline items to operations in execution order (no nested groups). */
export function flattenTimelineItems(items: TimelineItem[]): PatternStep[] {
  const out: PatternStep[] = [];
  for (const item of items) {
    if (isOperationGroup(item)) {
      out.push(...item.items);
    } else {
      out.push(item);
    }
  }
  return out;
}

/** Collect all step IDs and group IDs from timeline items. */
export function getTimelineItemIds(items: TimelineItem[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    ids.push(item.id);
    if (isOperationGroup(item)) {
      ids.push(...item.items.map((s) => s.id));
    }
  }
  return ids;
}

export interface WorkflowPatternSummary {
  id: string;
  name: string;
  description?: string;
  version?: number;
  origin_spreadsheet_id?: number | null;
  origin_sheet_id?: number | null;
  createdAt: string;
  is_archived?: boolean;
}

export interface WorkflowPatternStepRecord {
  id: string;
  seq: number;
  type: PatternStepType;
  params: Record<string, any>;
  disabled: boolean;
}

export interface WorkflowPatternDetail extends WorkflowPatternSummary {
  steps: WorkflowPatternStepRecord[];
}

export type CreatePatternStepPayload =
  | {
      seq: number;
      type: 'APPLY_FORMULA';
      disabled: boolean;
      params: {
        target: {
          row: number;
          col: number;
        };
        a1?: string;
        formula: string;
      };
    }
  | {
      seq: number;
      type: 'INSERT_ROW';
      disabled: boolean;
      params: InsertRowParams;
    }
  | {
      seq: number;
      type: 'INSERT_COLUMN';
      disabled: boolean;
      params: InsertColumnParams;
    }
  | {
      seq: number;
      type: 'DELETE_COLUMN';
      disabled: boolean;
      params: DeleteColumnParams;
    }
  | {
      seq: number;
      type: 'FILL_SERIES';
      disabled: boolean;
      params: FillSeriesParams;
    }
  | {
      seq: number;
      type: 'SET_COLUMN_NAME';
      disabled: boolean;
      params: SetColumnNameParams;
    }
  | {
      seq: number;
      type: 'APPLY_HIGHLIGHT';
      disabled: boolean;
      params: ApplyHighlightParams;
    }
  | {
      seq: number;
      type: 'GROUP';
      disabled: boolean;
      params: {
        name: string;
        items: Array<{ type: Exclude<PatternStepType, 'GROUP'>; params: Record<string, unknown>; disabled: boolean }>;
      };
    };

export interface CreatePatternPayload {
  name: string;
  description?: string;
  origin?: {
    spreadsheet_id?: number | null;
    sheet_id?: number | null;
  };
  steps: CreatePatternStepPayload[];
}

export type PatternJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

export interface ApplyPatternResponse {
  job_id: string;
  status: PatternJobStatus;
}

export interface PatternJobResponse {
  id: string;
  status: PatternJobStatus;
  progress: number;
  current_step?: number | null;
  error_code?: string | null;
  error_message?: string | null;
  createdAt?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface ListPatternsResponse {
  results: WorkflowPatternSummary[];
}

