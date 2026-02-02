export type PatternStepType = 'APPLY_FORMULA';

export interface PatternStep {
  id: string;
  type: PatternStepType;
  target: {
    row: number;
    col: number;
  };
  a1: string;
  formula: string;
  disabled: boolean;
  createdAt: string;
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

export interface CreatePatternStepPayload {
  seq: number;
  type: PatternStepType;
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

export interface CreatePatternPayload {
  name: string;
  description?: string;
  origin?: {
    spreadsheet_id?: number | null;
    sheet_id?: number | null;
  };
  steps: CreatePatternStepPayload[];
}

export interface ListPatternsResponse {
  results: WorkflowPatternSummary[];
}

