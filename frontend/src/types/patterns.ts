export type PatternStepType =
  | 'APPLY_FORMULA'
  | 'INSERT_ROW'
  | 'INSERT_COLUMN'
  | 'DELETE_COLUMN'
  | 'FILL_SERIES'
  | 'SET_COLUMN_NAME';

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

export type PatternStep =
  | ApplyFormulaStep
  | InsertRowStep
  | InsertColumnStep
  | DeleteColumnStep
  | FillSeriesStep
  | SetColumnNameStep;

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

export type PatternJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

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

