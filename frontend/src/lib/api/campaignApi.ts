import api from "../api";
import { CampaignData, CreateCampaignData, UpdateCampaignData } from "@/types/campaign";

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
};

