import { useState, useCallback } from 'react';
import { 
  GoogleAdsAPI, 
  GoogleAd, 
  AdCreateRequest, 
  AdListParams,
  AdStatus,
  AdType
} from '@/lib/api/googleAdsApi';
import { toast } from 'react-hot-toast';

export const useGoogleAdsData = () => {
  const [ads, setAds] = useState<GoogleAd[]>([]);
  const [currentAd, setCurrentAd] = useState<GoogleAd | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<any>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20); // Fixed page size to match backend default
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  
  // Sorting and filtering state
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<{
    status?: AdStatus;
    type?: AdType;
  }>({});

  const fetchAds = useCallback(async (params?: AdListParams) => {
    try {
      setLoading(true);
      setError(null);
      const data = await GoogleAdsAPI.getAds(params);
      console.log('Fetched ads data:', data);
      setTotalCount(data.count || 0);
      setHasNext(!!data.next);
      setHasPrevious(!!data.previous);
      if (params?.page) {
        setCurrentPage(params.page);
      }
      const results = Array.isArray(data) ? data : (data.results || []);
      setAds(results);
      return results;
    } catch (err: any) {
      setError(err);
      console.error('Error fetching ads:', err);
      if (err.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else if (err.response?.status === 403) {
        toast.error('You do not have permission to view ads');
      } else {
        toast.error('Failed to load ads');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAd = useCallback(async (adId: number) => {
    try {
      setLoading(true);
      setError(null);
      const ad = await GoogleAdsAPI.getAd(adId);
      setCurrentAd(ad);
      return ad;
    } catch (err: any) {
      setError(err);
      console.error('Error fetching ad:', err);
      if (err.response?.status === 404) {
        toast.error('Ad not found');
      } else if (err.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else {
        toast.error('Failed to load ad');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createAd = useCallback(async (formData: AdCreateRequest) => {
    try {
      setSubmitting(true);
      setError(null);
      console.log('Creating ad with data:', formData);
      const responseData = await GoogleAdsAPI.createAd(formData);
      console.log('Ad created with ID:', responseData.id);
      toast.success('Ad created successfully!');
      await fetchAds();
      return responseData;
    } catch (err: any) {
      setError(err);
      console.error('Error creating ad:', err);
      if (err.response?.data) {
        const errorData = err.response.data;
        const errorMessage = errorData.detail || 'Failed to create ad';
        toast.error(errorMessage);
      } else if (err.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else if (err.response?.status === 403) {
        toast.error('You do not have permission to create ads');
      } else if (err.code === 'ERR_NETWORK') {
        toast.error('Network error: Unable to connect to the server');
      } else {
        toast.error('Failed to create ad. Please try again.');
      }
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [fetchAds]);

  const updateAd = useCallback(async (
    adId: number,
    data: Partial<AdCreateRequest>
  ) => {
    try {
      setSubmitting(true);
      setError(null);
      const result = await GoogleAdsAPI.updateAd(adId, data);
      toast.success('Ad updated successfully!');
      await fetchAds();
      return result;
    } catch (err: any) {
      setError(err);
      console.error('Error updating ad:', err);
      if (err.response?.data) {
        const errorData = err.response.data;
        const errorMessage = errorData.detail || 'Failed to update ad';
        toast.error(errorMessage);
      } else if (err.response?.status === 404) {
        toast.error('Ad not found');
      } else if (err.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else {
        toast.error('Failed to update ad');
      }
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [fetchAds]);

  const deleteAd = useCallback(async (adId: number) => {
    try {
      setSubmitting(true);
      setError(null);
      await GoogleAdsAPI.deleteAd(adId);
      toast.success('Ad deleted successfully');
      await fetchAds();
    } catch (err: any) {
      setError(err);
      console.error('Error deleting ad:', err);
      if (err.response?.data) {
        const errorData = err.response.data;
        const errorMessage = errorData.detail || 'Failed to delete ad';
        toast.error(errorMessage);
      } else if (err.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else if (err.response?.status === 403) {
        toast.error('You do not have permission to delete ads');
      } else if (err.response?.status === 404) {
        toast.error('Ad not found');
      } else if (err.code === 'ERR_NETWORK') {
        toast.error('Network error: Unable to connect to the server');
      } else {
        toast.error('Failed to delete ad');
      }
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [fetchAds]);

  const buildQueryParams = useCallback((overrides?: any) => {
    const params: AdListParams = {
      page: overrides?.page ?? currentPage,
      page_size: overrides?.page_size ?? pageSize,
      ...overrides,
    };
    
    // Always include ordering if sortBy is set
    if (sortBy) {
      params.ordering = sortOrder === 'desc' ? `-${sortBy}` : sortBy;
    }
    
    // Only include status filter if it's explicitly set (not undefined)
    if (overrides?.status !== undefined) {
      params.status = overrides.status;
    } else if (filters.status !== undefined) {
      params.status = filters.status;
    }
    
    // Only include type filter if it's explicitly set (not undefined)
    if (overrides?.type !== undefined) {
      params.type = overrides.type;
    } else if (filters.type !== undefined) {
      params.type = filters.type;
    }
    
    return params;
  }, [currentPage, pageSize, sortBy, sortOrder, filters]);

  const nextPage = useCallback(async () => {
    if (hasNext) {
      await fetchAds(buildQueryParams({ page: currentPage + 1 }));
    }
  }, [hasNext, currentPage, fetchAds, buildQueryParams]);

  const previousPage = useCallback(async () => {
    if (hasPrevious && currentPage > 1) {
      await fetchAds(buildQueryParams({ page: currentPage - 1 }));
    }
  }, [hasPrevious, currentPage, fetchAds, buildQueryParams]);

  const goToPage = useCallback(async (page: number) => {
    await fetchAds(buildQueryParams({ page }));
  }, [fetchAds, buildQueryParams]);

  const sortByField = useCallback(async (field: string) => {
    if (!field || (sortBy === field && sortOrder === 'desc')) {
      setSortBy('');
      setSortOrder('asc');
      await fetchAds(buildQueryParams({ page: 1, ordering: undefined }));
      return;
    }
    let newSortOrder: 'asc' | 'desc' = 'asc';
    if (sortBy === field) {
      newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    }
    setSortBy(field);
    setSortOrder(newSortOrder);
    const ordering = newSortOrder === 'desc' ? `-${field}` : field;
    await fetchAds(buildQueryParams({ page: 1, ordering }));
  }, [sortBy, sortOrder, fetchAds, buildQueryParams]);

  const applyFilters = useCallback(async (newFilters: {
    status?: AdStatus;
    type?: AdType;
  }) => {
    console.log('Applying filters:', newFilters, 'current filters:', filters);
    
    // Check if the new filters are the same as current filters
    const isSameFilters = 
      filters.status === newFilters.status && 
      filters.type === newFilters.type;
    
    if (isSameFilters) {
      console.log('Filters are the same, no action needed');
      return;
    }
    
    // Create params object with the new filters
    const params: AdListParams = {
      page: 1,
      page_size: pageSize,
    };
    
    // Only include ordering if sortBy is set
    if (sortBy) {
      params.ordering = sortOrder === 'desc' ? `-${sortBy}` : sortBy;
    }
    
    // Only include filters if they are defined
    if (newFilters.status !== undefined) {
      params.status = newFilters.status;
    }
    if (newFilters.type !== undefined) {
      params.type = newFilters.type;
    }
    
    // Update filters state and fetch with new params
    setFilters(newFilters);
    await fetchAds(params);
  }, [fetchAds, pageSize, sortBy, sortOrder, filters]);

  const clearFilters = useCallback(async () => {
    console.log('Clearing filters, current filters:', filters);
    
    // Check if filters are already cleared
    const isAlreadyCleared = !filters.status && !filters.type;
    
    if (isAlreadyCleared) {
      console.log('Filters are already cleared, no action needed');
      return;
    }
    
    // Create a clean params object without any filters
    const cleanParams: AdListParams = {
      page: 1,
      page_size: pageSize,
    };
    
    // Only include ordering if sortBy is set
    if (sortBy) {
      cleanParams.ordering = sortOrder === 'desc' ? `-${sortBy}` : sortBy;
    }
    
    // Update filters state and fetch with clean params
    setFilters({});
    await fetchAds(cleanParams);
  }, [fetchAds, pageSize, sortBy, sortOrder, filters]);

  return {
    // State
    ads,
    currentAd,
    loading,
    submitting,
    error,
    
    // Pagination state
    currentPage,
    totalCount,
    pageSize,
    hasNext,
    hasPrevious,
    totalPages: Math.ceil(totalCount / pageSize),
    
    // Sorting and filtering state
    sortBy,
    sortOrder,
    filters,
    
    // Actions
    fetchAds,
    fetchAd,
    createAd,
    updateAd,
    deleteAd,
    
    // Pagination actions
    nextPage,
    previousPage,
    goToPage,
    
    // Sorting and filtering actions
    sortByField,
    applyFilters,
    clearFilters,
  };
};
