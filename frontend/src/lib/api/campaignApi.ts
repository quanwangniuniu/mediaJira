import api from "../api";
import { CampaignData, CreateCampaignData, UpdateCampaignData, CampaignTaskLink, CampaignActivityTimelineItem, CampaignStatusHistoryItem, CampaignCheckIn, CreateCheckInData, UpdateCheckInData } from "@/types/campaign";

export const CampaignAPI = {
  // List campaigns with optional filters
  getCampaigns: (params?: {
    project?: string;
    status?: string;
    owner?: string;
    assignee?: string;
    search?: string;
  }) => {
    return api.get("/api/campaigns/", { params });
  },

  // Get single campaign
  getCampaign: (id: string) => api.get(`/api/campaigns/${id}/`),

  // Create campaign
  createCampaign: (data: CreateCampaignData) => api.post("/api/campaigns/", data),

  // Update campaign
  updateCampaign: (id: string, data: UpdateCampaignData) => 
    api.patch(`/api/campaigns/${id}/`, data),

  // Delete campaign
  deleteCampaign: (id: string) => api.delete(`/api/campaigns/${id}/`),

  // Get task links for a campaign
  getTaskLinks: (campaignId: string) => {
    return api.get("/api/campaign-task-links/", { params: { campaign: campaignId } });
  },

  // Get activity timeline for a campaign
  getActivityTimeline: (campaignId: string) => {
    return api.get<CampaignActivityTimelineItem[]>(`/api/campaigns/${campaignId}/activity-timeline/`);
  },

  // Get status history for a campaign
  getStatusHistory: (campaignId: string) => {
    return api.get<CampaignStatusHistoryItem[]>(`/api/campaigns/${campaignId}/status-history/`);
  },

  // Transition campaign status
  transitionStatus: (campaignId: string, transition: string, statusNote?: string) => {
    const urlMap: Record<string, string> = {
      'start-testing': `/api/campaigns/${campaignId}/start-testing/`,
      'start-scaling': `/api/campaigns/${campaignId}/start-scaling/`,
      'start-optimizing': `/api/campaigns/${campaignId}/start-optimizing/`,
      'pause': `/api/campaigns/${campaignId}/pause/`,
      'resume': `/api/campaigns/${campaignId}/resume/`,
      'complete': `/api/campaigns/${campaignId}/complete/`,
      'archive': `/api/campaigns/${campaignId}/archive/`,
      'restore': `/api/campaigns/${campaignId}/restore/`,
    };

    const url = urlMap[transition];
    if (!url) {
      throw new Error(`Unknown transition: ${transition}`);
    }

    return api.post<CampaignData>(url, { status_note: statusNote || '' });
  },

  // Get check-ins for a campaign
  getCheckIns: (campaignId: string, params?: { sentiment?: string }) => {
    return api.get<CampaignCheckIn[]>(`/api/campaigns/${campaignId}/check-ins/`, { params });
  },

  // Create a new check-in
  createCheckIn: (campaignId: string, data: CreateCheckInData) => {
    return api.post<CampaignCheckIn>(`/api/campaigns/${campaignId}/check-ins/`, data);
  },

  // Update a check-in
  updateCheckIn: (campaignId: string, checkInId: string, data: UpdateCheckInData) => {
    return api.patch<CampaignCheckIn>(`/api/campaigns/${campaignId}/check-ins/${checkInId}/`, data);
  },

  // Delete a check-in
  deleteCheckIn: (campaignId: string, checkInId: string) => {
    return api.delete(`/api/campaigns/${campaignId}/check-ins/${checkInId}/`);
  },
};
