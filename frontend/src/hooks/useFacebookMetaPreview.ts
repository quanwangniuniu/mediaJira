import { useState, useCallback } from 'react';
import { FacebookMetaAPI } from '@/lib/api/facebookMetaApi';

export type PreviewFormat = 'desktop' | 'mobile' | 'story' | 'reel';

export const useFacebookMetaPreview = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewEnabled, setIsPreviewEnabled] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState<PreviewFormat>('desktop');
  const [previewData, setPreviewData] = useState<any>(null);

  /**
   * Toggle preview visibility
   */
  const togglePreview = useCallback((enabled: boolean) => {
    setIsPreviewEnabled(enabled);
  }, []);

  /**
   * Change preview format
   */
  const changeFormat = useCallback((format: PreviewFormat) => {
    setSelectedFormat(format);
  }, []);

  /**
   * Get preview JSON spec
   */
  const getPreviewSpec = useCallback(async (token: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await FacebookMetaAPI.getPreviewJsonSpec(token);
      return data;
    } catch (err: any) {
      console.error('Error getting preview spec:', err);
      setError(err.response?.data?.error || 'Failed to get preview spec');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    isPreviewEnabled,
    selectedFormat,
    previewData,
    togglePreview,
    changeFormat,
    getPreviewSpec,
    clearError,
  };
};
