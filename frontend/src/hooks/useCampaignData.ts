import { useCallback, useState } from "react";
import { CampaignAPI } from "@/lib/api/campaignApi";
import { CampaignData, CreateCampaignData, UpdateCampaignData } from "@/types/campaign";

export const useCampaignData = () => {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [currentCampaign, setCurrentCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const fetchCampaigns = useCallback(async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const response = await CampaignAPI.getCampaigns(params);
      const campaignsList = response.data.results || response.data || [];
      setCampaigns(campaignsList);
      return campaignsList;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCampaign = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await CampaignAPI.getCampaign(id);
      const campaign = response.data;
      setCurrentCampaign(campaign);
      return campaign;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCampaign = useCallback(async (data: CreateCampaignData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await CampaignAPI.createCampaign(data);
      const newCampaign = response.data;
      setCampaigns(prev => [newCampaign, ...prev]);
      return newCampaign;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCampaign = useCallback(async (id: string, data: UpdateCampaignData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await CampaignAPI.updateCampaign(id, data);
      const updatedCampaign = response.data;
      setCampaigns(prev => prev.map(c => c.id === id ? updatedCampaign : c));
      if (currentCampaign?.id === id) {
        setCurrentCampaign(updatedCampaign);
      }
      return updatedCampaign;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentCampaign]);

  return {
    campaigns,
    currentCampaign,
    loading,
    error,
    fetchCampaigns,
    fetchCampaign,
    createCampaign,
    updateCampaign,
  };
};

