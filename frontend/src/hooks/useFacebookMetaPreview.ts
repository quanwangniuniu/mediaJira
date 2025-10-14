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
    clearError,
  };
};
