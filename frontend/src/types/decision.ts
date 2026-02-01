export type DecisionStatus =
  | 'DRAFT'
  | 'AWAITING_APPROVAL'
  | 'COMMITTED'
  | 'REVIEWED'
  | 'ARCHIVED';

export type DecisionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type SignalMetric =
  | 'ROAS'
  | 'CPA'
  | 'CONVERSION_RATE'
  | 'REVENUE'
  | 'PURCHASES'
  | 'CTR'
  | 'CLICKS'
  | 'IMPRESSIONS'
  | 'CPC'
  | 'CPM'
  | 'AD_SPEND'
  | 'AOV';

export type SignalMovement =
  | 'SHARP_INCREASE'
  | 'MODERATE_INCREASE'
  | 'SLIGHT_INCREASE'
  | 'NO_SIGNIFICANT_CHANGE'
  | 'SLIGHT_DECREASE'
  | 'MODERATE_DECREASE'
  | 'SHARP_DECREASE'
  | 'VOLATILE'
  | 'UNEXPECTED_SPIKE'
  | 'UNEXPECTED_DROP';

export type SignalPeriod =
  | 'LAST_24_HOURS'
  | 'LAST_3_DAYS'
  | 'LAST_7_DAYS'
  | 'LAST_14_DAYS'
  | 'LAST_30_DAYS';

export type SignalComparison =
  | 'NONE'
  | 'PREVIOUS_PERIOD'
  | 'SAME_PERIOD_LAST_WEEK'
  | 'SINCE_LAUNCH';

export type SignalScopeType =
  | 'CAMPAIGN'
  | 'AD_SET'
  | 'AD'
  | 'CHANNEL'
  | 'AUDIENCE'
  | 'REGION';

export type SignalDeltaUnit = 'PERCENT' | 'CURRENCY' | 'ABSOLUTE';

export interface DecisionSignal {
  id: number;
  decisionId: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  metric: SignalMetric;
  movement: SignalMovement;
  period: SignalPeriod;
  comparison: SignalComparison;
  scopeType?: SignalScopeType | null;
  scopeValue?: string | null;
  deltaValue?: number | null;
  deltaUnit?: SignalDeltaUnit | null;
  displayText: string;
  displayTextOverride?: string | null;
}

export interface DecisionSignalListResponse {
  items: DecisionSignal[];
}

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
  id?: number;
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
  options?: DecisionOptionDraft[];
  signals?: DecisionSignalDraft[];
}

export interface DecisionListItem {
  id: number;
  title?: string | null;
  status: DecisionStatus;
  updatedAt?: string | null;
  createdAt?: string | null;
  committedAt?: string | null;
  lastEditedAt?: string | null;
}

export interface DecisionListResponse {
  items: DecisionListItem[];
  nextPageToken?: string | null;
}

export interface DecisionCommitResponse {
  detail: string;
  status: DecisionStatus;
  next_action?: string | null;
  decision: DecisionCommittedResponse;
}

export type DecisionQuality = 'GOOD' | 'ACCEPTABLE' | 'POOR';

export interface DecisionReviewPayload {
  outcomeText: string;
  reflectionText: string;
  decisionQuality: DecisionQuality;
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
