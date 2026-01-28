export type DecisionStatus =
  | 'DRAFT'
  | 'AWAITING_APPROVAL'
  | 'COMMITTED'
  | 'REVIEWED'
  | 'ARCHIVED';

export type DecisionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DecisionOptionDraft {
  id?: number;
  decisionId?: number;
  text: string;
  isSelected: boolean;
  order: number;
}

export interface DecisionSignalDraft {
  id: number;
  type: string;
  description: string;
  severity?: string | null;
  source?: string | null;
  order?: number;
}

export interface DecisionDraftResponse {
  title?: string | null;
  contextSummary?: string | null;
  riskLevel?: DecisionRiskLevel | null;
  confidenceScore?: number | null;
  reasoning?: string | null;
  signals?: DecisionSignalDraft[];
  options?: DecisionOptionDraft[];
  createdAt?: string;
  createdBy?: number | null;
  lastEditedAt?: string;
  lastEditedBy?: number | null;
  isReferenceCase?: boolean;
}

export interface DecisionCommittedResponse {
  id: number;
  status: DecisionStatus;
  title?: string | null;
  contextSummary?: string | null;
  riskLevel?: DecisionRiskLevel | null;
  confidenceScore?: number | null;
  reasoning?: string | null;
  createdAt?: string;
  createdBy?: number | null;
  committedAt?: string | null;
  isReferenceCase?: boolean;
}

export interface DecisionCommitResponse {
  detail: string;
  status: DecisionStatus;
  next_action?: string | null;
  decision: DecisionCommittedResponse;
}

export interface DecisionValidationErrorDetail {
  field: string;
  message: string;
}

export interface DecisionValidationErrorResponse {
  error: {
    code: string;
    message: string;
    details?: {
      fieldErrors?: DecisionValidationErrorDetail[];
    };
  };
}
