export type CreativeType = 'image' | 'video' | 'carousel' | 'collection' | 'email';
export type VariationStatus = 'Draft' | 'Live' | 'Testing' | 'Winner' | 'Loser' | 'Paused';

export interface CopyElement {
  id?: number;
  variationId?: number;
  elementKey: string;
  value: string;
  locale?: string | null;
  position?: number | null;
  meta?: Record<string, any> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface VariationPerformanceEntry {
  id: number;
  variationId: number;
  recordedAt: string;
  metrics: Record<string, number | string>;
  trendIndicator?: string | null;
  observations?: string | null;
  createdAt?: string;
  createdBy?: string;
}

export interface VariationStatusHistory {
  id: number;
  variationId: number;
  fromStatus: VariationStatus;
  toStatus: VariationStatus;
  reason?: string | null;
  changedAt: string;
  changedBy?: string;
}

export interface AdGroup {
  id: number;
  campaignId: number;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MediaAsset {
  id: number | string;
  fileUrl: string;
  thumbnailUrl?: string | null;
  fileType?: string;
}

export interface AdVariation {
  id: number;
  campaignId: number;
  adGroupId?: number | null;
  name: string;
  creativeType: CreativeType;
  status: VariationStatus;
  tags: string[];
  notes?: string | null;
  formatPayload?: Record<string, any> & {
    imageUrl?: string;
    videoUrl?: string;
    previewUrl?: string;
    logoUrl?: string;
    mediaAssets?: MediaAsset[];
    logoAssets?: MediaAsset[];
  };
  copyElements: CopyElement[];
  createdAt: string;
  updatedAt: string;
  adSetName?: string | null;
  delivery?: string | null;
  bidStrategy?: string | null;
  budget?: number | string | null;
}

export interface ComparisonRow {
  key: string;
  values: Record<string, any>;
}

export interface ComparisonResponse {
  columns: { variationIds: number[] };
  rows: ComparisonRow[];
  performanceSummary?: Record<string, { recordedAt: string; metrics: Record<string, any> }>;
}
