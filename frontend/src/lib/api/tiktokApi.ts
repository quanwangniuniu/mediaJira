import api from '../api';

export interface TiktokMaterialItem {
  id: number;
  type: 'video' | 'image';
  url: string; // fallback url
  previewUrl?: string; // thumbnail or preview image/video
  fileUrl?: string; // actual playable/ downloadable file url
  title?: string;
  created_at?: string;
  width?: number;
  height?: number;
}

export interface TiktokMaterialListResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: TiktokMaterialItem[];
}

export const getTiktokMaterials = async (params?: { page?: number; page_size?: number; type?: 'video' | 'image'; search?: string; }): Promise<TiktokMaterialListResponse> => {
  const response = await api.get<any>('/api/tiktok/material/list/', {
    params: {
      ...params,
      // Some servers expect ptype; send both for compatibility
      ptype: params?.type,
    },
  });
  const data: any = response.data;
  // Case 1: Array
  if (Array.isArray(data)) {
    return { results: data as TiktokMaterialItem[] };
  }
  // Case 2: Facebook-like { results: [...] }
  if (Array.isArray(data?.results)) {
    return { results: data.results as TiktokMaterialItem[], count: data.count, next: data.next, previous: data.previous };
  }
  // Case 3: TikTok-like { items: [...] }
  if (Array.isArray(data?.items)) {
    const mapped: TiktokMaterialItem[] = data.items.map((it: any) => ({
      id: Number(it.id),
      type: String(it.type).toLowerCase() === 'image' ? 'image' : 'video',
      url: it.preview_url || it.url || it.source_url || it.file_url || '',
      previewUrl: it.preview_url || it.thumbnail_url || undefined,
      fileUrl: it.file_url || it.url || it.source_url || undefined,
      title: it.name || it.title,
      created_at: it.created_at,
      width: it.width,
      height: it.height,
    }));
    return { results: mapped, count: data.total, next: null, previous: null };
  }
  // Fallback
  return { results: [] };
};

export const uploadTiktokVideo = async (
  file: File,
  onUploadProgress?: (p: { loaded: number; total?: number; percent?: number }) => void,
): Promise<{ success: boolean } | any> => {
  const formData = new FormData();
  formData.append('file', file);
  // Backend expects a name field
  formData.append('name', file.name);
  const res = await api.post('/api/tiktok/file/video/ad/upload/', formData, {
    onUploadProgress: (e) => onUploadProgress?.({ loaded: e.loaded, total: e.total, percent: e.total ? (e.loaded / e.total) * 100 : undefined }),
  });
  return res.data;
};

export const uploadTiktokImage = async (
  file: File,
  onUploadProgress?: (p: { loaded: number; total?: number; percent?: number }) => void,
): Promise<{ success: boolean } | any> => {
  const formData = new FormData();
  formData.append('file', file);
  // Backend expects a name field
  formData.append('name', file.name);
  const res = await api.post('/api/tiktok/file/image/ad/upload/', formData, {
    onUploadProgress: (e) => onUploadProgress?.({ loaded: e.loaded, total: e.total, percent: e.total ? (e.loaded / e.total) * 100 : undefined }),
  });
  return res.data;
};

// Ad Draft interfaces and API functions
export interface AdDraftAssets {
  primaryCreative?: TiktokMaterialItem | null;
  images?: TiktokMaterialItem[];
}

export interface AdDraft {
  id?: string; // UUID
  name?: string | null;
  ad_text?: string | null;
  call_to_action_mode?: 'dynamic' | 'standard' | null;
  call_to_action_label?: string | null;
  assets?: AdDraftAssets;
  created_by_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AdGroup {
  id?: string; // UUID (optional when creating)
  gid?: string;
  name: string;
  created_by_id?: number;
  created_at?: string;
  updated_at?: string;
  ad_drafts?: AdDraft[]; // Nested ad drafts when fetching from creation/detail
}

// Normalized AdDraft structure returned by creation/detail API
export interface NormalizedAdDraft {
  id: string; // UUID
  ad_draft_id: string; // aid or id
  group_id: string | null; // UUID of ad_group
  name: string;
  ad_text: string;
  call_to_action?: any | null;
  landing_page_url?: string | null;
  creative_type: string; // e.g., "SINGLE_VIDEO", "SINGLE_IMAGE", etc.
  assets: any[]; // Normalized to always be an array
  preview: any; // Preview data object
  status: string; // e.g., "DRAFT_SAVED"
  created_at: string | null; // ISO format timestamp
  updated_at: string | null; // ISO format timestamp
}

// Brief AdDraft item in AdGroup response (from creation/detail API)
export interface BriefAdDraftItem {
  ad_draft_id: string; // aid or id
  name: string;
  creative_type: string; // e.g., "SINGLE_VIDEO", "SINGLE_IMAGE", etc.
  create_timestamp: number; // Unix timestamp
}

export interface NormalizedAdGroup {
  id: string; // UUID
  gid: string; // External display ID (e.g., G-2025-0001)
  name: string;
  created_at: string | null; // ISO format timestamp
  updated_at: string | null; // ISO format timestamp
  ad_drafts: BriefAdDraftItem[]; // Brief info of drafts in this group
}

export interface CreationDetailResponse {
  ad_drafts: NormalizedAdDraft[];
  ad_groups: NormalizedAdGroup[];
}

/**
 * Save or update ad drafts in batch
 * Accepts adgroup_id and form_data_list to create/update multiple ad drafts
 * 
 * @param params - Object containing adgroup_id and form_data_list
 * @returns Response with ad-graft-id array
 */
export interface SaveAdDraftRequest {
  adgroup_id?: string | null; // UUID of ad group (optional)
  form_data_list: Partial<AdDraft>[]; // Array of ad draft data
}

export interface SaveAdDraftResponse {
  data: {
    'ad-draft-id': string[]; // Array of saved ad draft UUIDs
  };
  msg: string;
  warnings?: Array<{
    index: number;
    error: string;
    details?: any;
  }>;
}

export const saveAdDraft = async (params: SaveAdDraftRequest): Promise<SaveAdDraftResponse> => {
  const res = await api.post('/api/tiktok/creation/ad-drafts/save/', {
    adgroup_id: params.adgroup_id || null,
    form_data_list: params.form_data_list,
  });
  return res.data;
};

/**
 * Delete ad drafts in batch
 * Accepts ad_draft_ids list to delete multiple ad drafts
 * 
 * @param ad_draft_ids - Array of ad draft UUID strings
 * @returns Response with deleted_ids array
 */
export interface DeleteAdDraftResponse {
  data: {
    deleted_ids: string[];
  };
  msg: string;
  warnings?: {
    not_found_ids?: string[];
  };
}

export const deleteAdDraft = async (ad_draft_ids: string[]): Promise<DeleteAdDraftResponse> => {
  const res = await api.post('/api/tiktok/creation/ad-drafts/delete/', {
    ad_draft_ids: ad_draft_ids,
  });
  return res.data;
};

/**
 * Save or update an ad group (supports rename)
 * Real-time save endpoint. If id is provided, updates existing group; otherwise creates new group.
 * 
 * @param adGroup - AdGroup object with id (optional) and name
 * @returns Response with ad-group-id
 */
export interface SaveAdGroupResponse {
  data: {
    'ad-group-id': string;
  };
  msg: string;
}

export const saveAdGroup = async (adGroup: AdGroup): Promise<SaveAdGroupResponse> => {
  const res = await api.post('/api/tiktok/creation/ad-group/save/', {
    id: adGroup.id || undefined,
    name: adGroup.name,
  });
  return res.data;
};

/**
 * Delete ad groups in batch
 * Accepts ad_group_ids list to delete multiple ad groups
 * 
 * @param ad_group_ids - Array of ad group UUID strings
 * @returns Response with deleted_ids array
 */
export interface DeleteAdGroupResponse {
  data: {
    deleted_ids: string[];
  };
  msg: string;
  warnings?: {
    not_found_ids?: string[];
  };
}

export const deleteAdGroup = async (ad_group_ids: string[]): Promise<DeleteAdGroupResponse> => {
  const res = await api.post('/api/tiktok/creation/ad-group/delete/', {
    ad_group_ids: ad_group_ids,
  });
  return res.data;
};

/**
 * Get creation details by ad_draft_ids and/or ad_group_ids
 * Can pass multiple IDs of either or both types
 * Also supports aids for backward compatibility
 */
export const getCreationDetail = async (params: {
  ad_draft_ids?: string[]; // Array of UUID strings for ad drafts
  aids?: string[]; // Array of external ad draft IDs (backward compatibility)
  ad_group_ids?: string[]; // Array of UUID strings for ad groups
}): Promise<CreationDetailResponse> => {
  const res = await api.post('/api/tiktok/creation/detail/', {
    ad_draft_ids: params.ad_draft_ids || [],
    aids: params.aids || [],
    ad_group_ids: params.ad_group_ids || [],
  });
  // Backend returns {msg, data: {ad_drafts, ad_groups}}
  // Extract the data field
  return res.data.data || { ad_drafts: [], ad_groups: [] };
};

/**
 * Brief info for sidebar
 * Returns ad groups with brief ad draft information
 */
export interface BriefInfoItem {
  id: string; // UUID for API calls
  ad_draft_id: string; // External display ID (aid or id)
  name: string;
  creative_type: string; // e.g., "SINGLE_VIDEO", "SINGLE_IMAGE", or "UNKNOWN"
  opt_status: number; // Optimization status (default 0)
  create_timestamp: number; // Unix timestamp
}

export interface AdGroupBriefInfo {
  id: string; // UUID for API calls
  gid: string; // External display ID (e.g., G-2025-0001)
  name: string;
  create_timestamp: number; // Unix timestamp
  creative_brief_info_item_list: BriefInfoItem[]; // Brief info of drafts in this group
}

export interface BriefInfoListResponse {
  msg: string;
  data: {
    ad_group_brief_info_list: AdGroupBriefInfo[];
    total_groups: number;
    limit_groups: number;
    offset_groups: number;
  } | null;
}

/**
 * Get brief info list for sidebar
 * Supports pagination with limit_groups, offset_groups, and limit_items_per_group
 */
export const getBriefInfoList = async (params?: {
  limit_groups?: number; // Default 50, max 200
  offset_groups?: number; // Default 0
  limit_items_per_group?: number; // Default 20, max 100
}): Promise<BriefInfoListResponse> => {
  const res = await api.get('/api/tiktok/creation/sidebar/brief_info_list/', {
    params: {
      limit_groups: params?.limit_groups,
      offset_groups: params?.offset_groups,
      limit_items_per_group: params?.limit_items_per_group,
    },
  });
  return res.data;
};

// Shareable preview
export const shareAdDraft = async (adDraftId: string): Promise<{ slug: string }> => {
  const res = await api.post(`/api/tiktok/ad-drafts/${adDraftId}/share/`, {});
  return res.data?.data || { slug: '' };
};

export const fetchPublicPreview = async (slug: string): Promise<any> => {
  const res = await api.get(`/api/tiktok/public-previews/${slug}/`);
  return res.data?.data;
};


