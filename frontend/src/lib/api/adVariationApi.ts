import api from '../api';
import type { AdGroup, AdVariation, ComparisonResponse, VariationPerformanceEntry, VariationStatusHistory } from '@/types/adVariation';

export const AdVariationAPI = {
  listVariations: async (campaignId: number, params?: Record<string, any>) => {
    const response = await api.get(`/api/campaigns/${campaignId}/variations`, { params });
    return (response.data.items || response.data.results || response.data) as AdVariation[];
  },
  getVariation: async (campaignId: number, variationId: number) => {
    const response = await api.get(`/api/campaigns/${campaignId}/variations/${variationId}`);
    return response.data as AdVariation;
  },
  createVariation: async (campaignId: number, payload: Record<string, any>) => {
    const response = await api.post(`/api/campaigns/${campaignId}/variations`, payload);
    return response.data as AdVariation;
  },
  updateVariation: async (campaignId: number, variationId: number, payload: Record<string, any>) => {
    const response = await api.patch(`/api/campaigns/${campaignId}/variations/${variationId}`, payload);
    return response.data as AdVariation;
  },
  deleteVariation: async (campaignId: number, variationId: number) =>
    api.delete(`/api/campaigns/${campaignId}/variations/${variationId}`),
  duplicateVariation: async (campaignId: number, variationId: number, payload?: Record<string, any>) => {
    const response = await api.post(
      `/api/campaigns/${campaignId}/variations/${variationId}/duplicate`,
      payload || {}
    );
    return response.data as AdVariation;
  },
  changeStatus: async (campaignId: number, variationId: number, payload: Record<string, any>) => {
    const response = await api.post(`/api/campaigns/${campaignId}/variations/${variationId}/status`, payload);
    return response.data as { variation: AdVariation; statusHistory: VariationStatusHistory };
  },
  listStatusHistory: async (campaignId: number, variationId: number, params?: Record<string, any>) => {
    const response = await api.get(`/api/campaigns/${campaignId}/variations/${variationId}/status-history`, { params });
    return (response.data.items || response.data.results || response.data) as VariationStatusHistory[];
  },
  listAdGroups: async (campaignId: number) => {
    const response = await api.get(`/api/campaigns/${campaignId}/ad-groups`);
    return (response.data.items || response.data.results || response.data) as AdGroup[];
  },
  createAdGroup: async (campaignId: number, payload: Record<string, any>) => {
    const response = await api.post(`/api/campaigns/${campaignId}/ad-groups`, payload);
    return response.data as AdGroup;
  },
  updateAdGroup: async (campaignId: number, adGroupId: number, payload: Record<string, any>) => {
    const response = await api.patch(`/api/campaigns/${campaignId}/ad-groups/${adGroupId}`, payload);
    return response.data as AdGroup;
  },
  deleteAdGroup: async (campaignId: number, adGroupId: number) =>
    api.delete(`/api/campaigns/${campaignId}/ad-groups/${adGroupId}`),
  assignVariationsToGroup: async (campaignId: number, adGroupId: number, variationIds: number[]) => {
    const response = await api.post(`/api/campaigns/${campaignId}/ad-groups/${adGroupId}/variations`, { variationIds });
    return response.data;
  },
  removeVariationsFromGroup: async (campaignId: number, adGroupId: number, variationIds: number[]) => {
    const response = await api.delete(`/api/campaigns/${campaignId}/ad-groups/${adGroupId}/variations`, {
      data: { variationIds },
    });
    return response.data;
  },
  compareVariations: async (campaignId: number, variationIds: number[]) => {
    const response = await api.post(`/api/campaigns/${campaignId}/variations/compare`, { variationIds });
    return response.data as ComparisonResponse;
  },
  addPerformanceEntry: async (campaignId: number, variationId: number, payload: Record<string, any>) => {
    const response = await api.post(`/api/campaigns/${campaignId}/variations/${variationId}/performance`, payload);
    return response.data as VariationPerformanceEntry;
  },
  listPerformance: async (campaignId: number, variationId: number, params?: Record<string, any>) => {
    const response = await api.get(`/api/campaigns/${campaignId}/variations/${variationId}/performance`, { params });
    return (response.data.items || response.data.results || response.data) as VariationPerformanceEntry[];
  },
  getLatestPerformance: async (campaignId: number, variationId: number) => {
    const response = await api.get(`/api/campaigns/${campaignId}/variations/${variationId}/performance/latest`);
    return response.data as { recordedAt: string | null; metrics: Record<string, any> };
  },
  bulkOperate: async (campaignId: number, payload: Record<string, any>) => {
    const response = await api.post(`/api/campaigns/${campaignId}/variations/bulk`, payload);
    return response.data as { results: Array<{ variationId: number; success: boolean; error?: any }> };
  },
};

export default AdVariationAPI;
