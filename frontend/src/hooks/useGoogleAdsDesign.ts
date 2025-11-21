import { useState, useCallback } from 'react';
import { GoogleAdsAPI, GoogleAd, AdType } from '@/lib/api/googleAdsApi';
import { checkAdCompleteness, getAdCompletenessPercentage } from '@/utils/googleAdsValidation';

export interface UseGoogleAdsDesignReturn {
  // State
  ad: GoogleAd | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  
  // Actions
  fetchAd: (adId: number) => Promise<void>;
  updateAd: (data: any) => Promise<void>;
  saveAd: (getFormData?: () => any) => Promise<void>; // Accept form data getter
  publishAd: () => Promise<void>;
  
  // Computed (support local state)
  isComplete: (localAdData?: any) => boolean;
  completenessPercentage: (localAdData?: any) => number;
  missingFields: (localAdData?: any) => string[];
}

export function useGoogleAdsDesign(adId?: number): UseGoogleAdsDesignReturn {
  const [ad, setAd] = useState<GoogleAd | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAd = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const fetchedAd = await GoogleAdsAPI.getAd(id);
      setAd(fetchedAd);
    } catch (err: any) {
      console.error('Error fetching ad:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ad');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAd = useCallback(async (data: any) => {
    if (!ad) return;
    
    try {
      setSaving(true);
      setError(null);
      
      console.log('useGoogleAdsDesign.updateAd called with data:', JSON.stringify(data, null, 2));
      console.log('Updating ad ID:', ad.id);
      
      // Update the ad with new data on backend
      await GoogleAdsAPI.updateAdTypeFields(ad.id, data);
      
      // Refresh ad data from backend to get latest state immediately
      const refreshedAd = await GoogleAdsAPI.getAd(ad.id);
      setAd(refreshedAd);
      console.log('Ad data refreshed for progress calculation');
    } catch (err) {
      console.error('Error in updateAd:', err);
      setError(err instanceof Error ? err.message : 'Failed to update ad');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [ad]);

  const saveAd = useCallback(async (getFormData?: () => any) => {
    if (!ad) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // If form data getter provided, use it for optimistic save
      if (getFormData) {
        const formData = getFormData();
        await GoogleAdsAPI.updateAdTypeFields(ad.id, formData);
      } else {
        // Legacy: just update the status
        await GoogleAdsAPI.updateAdTypeFields(ad.id, { status: ad.status });
      }
      
      // Refresh ad data from backend
      const refreshedAd = await GoogleAdsAPI.getAd(ad.id);
      setAd(refreshedAd);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save ad');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [ad]);

  const publishAd = useCallback(async () => {
    if (!ad) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Update status to PUBLISHED
      await GoogleAdsAPI.updateAdTypeFields(ad.id, { status: 'PUBLISHED' });
      
      // Refresh ad data
      const updatedAd = await GoogleAdsAPI.getAd(ad.id);
      setAd(updatedAd);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish ad');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [ad]);

  // Computed functions that support local state
  const isComplete = useCallback((localAdData?: any) => {
    const adToCheck = localAdData || ad;
    if (!adToCheck) return false;
    return checkAdCompleteness(adToCheck).is_complete;
  }, [ad]);

  const completenessPercentage = useCallback((localAdData?: any) => {
    const adToCheck = localAdData || ad;
    if (!adToCheck) return 0;
    return getAdCompletenessPercentage(adToCheck);
  }, [ad]);

  const missingFields = useCallback((localAdData?: any) => {
    const adToCheck = localAdData || ad;
    if (!adToCheck) return [];
    return checkAdCompleteness(adToCheck).missing_fields;
  }, [ad]);

  return {
    // State
    ad,
    loading,
    saving,
    error,
    
    // Actions
    fetchAd,
    updateAd,
    saveAd,
    publishAd,
    
    // Computed functions
    isComplete,
    completenessPercentage,
    missingFields,
  };
}
