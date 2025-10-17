import { useState, useCallback } from 'react';
import { FacebookMetaAPI, AdCreative, AdCreativeFormData } from '@/lib/api/facebookMetaApi';
import { toast } from 'react-hot-toast';

export const useFacebookMetaData = () => {
  const [adCreatives, setAdCreatives] = useState<AdCreative[]>([]);
  const [currentCreative, setCurrentCreative] = useState<AdCreative | null>(null);
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
    status?: string;
    call_to_action_type?: string;
  }>({});

  /**
   * Fetch all ad creatives with pagination, sorting, and filtering
   */
  const fetchAdCreatives = useCallback(async (params?: { 
    fields?: string;
    page?: number;
    page_size?: number;
    ordering?: string;
    status?: string;
    call_to_action_type?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await FacebookMetaAPI.getAdCreatives(params);
      
      console.log('Fetched ad creatives data:', data);
      
      // Update pagination state
      setTotalCount(data.count || 0);
      setHasNext(!!data.next);
      setHasPrevious(!!data.previous);
      if (params?.page) {
        setCurrentPage(params.page);
      }
      
      // Handle both array and paginated response formats
      const results = Array.isArray(data) ? data : (data.results || []);
      
      // Map the backend data to our table interface
      const mappedCreatives = results.map((item: any) => ({
        id: item.id,
        name: item.name,
        status: item.status || 'DRAFT',
        call_to_action_type: item.call_to_action_type || 
                             item.object_story_spec?.link_data?.call_to_action?.type || 
                             'NO_BUTTON',
        object_story_spec: item.object_story_spec,
      }));
      
      console.log('Mapped ad creatives:', mappedCreatives);
      
      setAdCreatives(mappedCreatives);
      return mappedCreatives;
      
    } catch (err: any) {
      setError(err);
      console.error('Error fetching ad creatives:', err);
      
      // Handle specific error cases
      if (err.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else if (err.response?.status === 403) {
        toast.error('You do not have permission to view ad creatives');
      } else {
        toast.error('Failed to load ad creatives');
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch a single ad creative by ID
   */
  const fetchAdCreative = useCallback(async (
    adCreativeId: string,
    params?: { fields?: string; thumbnail_width?: number; thumbnail_height?: number }
  ) => {
    try {
      setLoading(true);
      setError(null);
      
      const creative = await FacebookMetaAPI.getAdCreative(adCreativeId, params);
      setCurrentCreative(creative);
      return creative;
      
    } catch (err: any) {
      setError(err);
      console.error('Error fetching ad creative:', err);
      
      if (err.response?.status === 404) {
        toast.error('Ad Creative not found');
      } else if (err.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else {
        toast.error('Failed to load ad creative');
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new ad creative
   */
  const createAdCreative = useCallback(async (formData: AdCreativeFormData) => {
    try {
      setSubmitting(true);
      setError(null);
      
      console.log('Creating ad creative with data:', formData);
      
      const responseData = await FacebookMetaAPI.createAdCreative(formData);
      
      // Success response
      console.log('Ad Creative created with ID:', responseData.data.id);
      toast.success('Ad Creative created successfully!');
      
      // Refresh the list
      await fetchAdCreatives();
      
      return responseData;
      
    } catch (err: any) {
      setError(err);
      console.error('Error creating ad creative:', err);
      
      // Handle specific error responses from backend
      if (err.response?.data) {
        const errorData = err.response.data;
        const errorMessage = errorData.error || 'Failed to create ad creative';
        const errorCode = errorData.code || 'UNKNOWN_ERROR';
        
        console.error('API Error:', errorCode, errorMessage);
        
        // Show specific error messages based on error code
        if (errorCode === 'INVALID_DATA') {
          toast.error('Invalid data: ' + errorMessage);
        } else if (errorCode === 'VALIDATION_ERROR') {
          toast.error('Validation error: ' + errorMessage);
        } else if (errorCode === 'INTERNAL_ERROR') {
          toast.error('Server error: ' + errorMessage);
        } else {
          toast.error(errorMessage);
        }
      } else if (err.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else if (err.response?.status === 403) {
        toast.error('You do not have permission to create ad creatives');
      } else if (err.code === 'ERR_NETWORK') {
        toast.error('Network error: Unable to connect to the server');
      } else {
        toast.error('Failed to create ad creative. Please try again.');
      }
      
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [fetchAdCreatives]);

  /**
   * Update an ad creative
   */
  const updateAdCreative = useCallback(async (
    adCreativeId: string,
    data: Partial<{
      name: string;
      status: string;
      account_id: string;
      adlabels: string[];
    }>
  ) => {
    try {
      setSubmitting(true);
      setError(null);
      
      const result = await FacebookMetaAPI.updateAdCreative(adCreativeId, data);
      
      toast.success('Ad Creative updated successfully!');
      
      // Refresh the list
      await fetchAdCreatives();
      
      return result;
      
    } catch (err: any) {
      setError(err);
      console.error('Error updating ad creative:', err);
      
      if (err.response?.data) {
        const errorData = err.response.data;
        const errorMessage = errorData.error || 'Failed to update ad creative';
        toast.error(errorMessage);
      } else if (err.response?.status === 404) {
        toast.error('Ad Creative not found');
      } else if (err.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else {
        toast.error('Failed to update ad creative');
      }
      
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [fetchAdCreatives]);

  /**
   * Delete an ad creative
   */
  const deleteAdCreative = useCallback(async (adCreativeId: string) => {
    try {
      setSubmitting(true);
      setError(null);
      
      await FacebookMetaAPI.deleteAdCreative(adCreativeId);
      
      toast.success('Ad Creative deleted successfully');
      
      // Refresh the list
      await fetchAdCreatives();
      
    } catch (err: any) {
      setError(err);
      console.error('Error deleting ad creative:', err);
      
      // Handle specific error responses
      if (err.response?.data) {
        const errorData = err.response.data;
        const errorMessage = errorData.error || 'Failed to delete ad creative';
        toast.error(errorMessage);
      } else if (err.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
      } else if (err.response?.status === 403) {
        toast.error('You do not have permission to delete ad creatives');
      } else if (err.response?.status === 404) {
        toast.error('Ad Creative not found');
      } else if (err.code === 'ERR_NETWORK') {
        toast.error('Network error: Unable to connect to the server');
      } else {
        toast.error('Failed to delete ad creative');
      }
      
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [fetchAdCreatives]);

  /**
   * Build query params from current state
   */
  const buildQueryParams = useCallback((overrides?: any) => {
    const params: any = {
      page: overrides?.page ?? currentPage,
      page_size: overrides?.page_size ?? pageSize,
      ...overrides,
    };
    
    // Add sorting
    if (sortBy) {
      params.ordering = sortOrder === 'desc' ? `-${sortBy}` : sortBy;
    }
    
    // Add filters
    if (filters.status) {
      params.status = filters.status;
    }
    if (filters.call_to_action_type) {
      params.call_to_action_type = filters.call_to_action_type;
    }
    
    return params;
  }, [currentPage, pageSize, sortBy, sortOrder, filters]);

  /**
   * Go to next page
   */
  const nextPage = useCallback(async () => {
    if (hasNext) {
      await fetchAdCreatives(buildQueryParams({ page: currentPage + 1 }));
    }
  }, [hasNext, currentPage, fetchAdCreatives, buildQueryParams]);

  /**
   * Go to previous page
   */
  const previousPage = useCallback(async () => {
    if (hasPrevious && currentPage > 1) {
      await fetchAdCreatives(buildQueryParams({ page: currentPage - 1 }));
    }
  }, [hasPrevious, currentPage, fetchAdCreatives, buildQueryParams]);

  /**
   * Go to specific page
   */
  const goToPage = useCallback(async (page: number) => {
    await fetchAdCreatives(buildQueryParams({ page }));
  }, [fetchAdCreatives, buildQueryParams]);


  /**
   * Sort by field
   */
  const sortByField = useCallback(async (field: string) => {
    // If empty string or same field clicked twice in desc, clear sorting
    if (!field || (sortBy === field && sortOrder === 'desc')) {
      setSortBy('');
      setSortOrder('asc');
      await fetchAdCreatives(buildQueryParams({ page: 1, ordering: undefined }));
      return;
    }
    
    let newSortOrder: 'asc' | 'desc' = 'asc';
    
    // If clicking the same field, toggle order
    if (sortBy === field) {
      newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    }
    
    setSortBy(field);
    setSortOrder(newSortOrder);
    
    const ordering = newSortOrder === 'desc' ? `-${field}` : field;
    await fetchAdCreatives(buildQueryParams({ page: 1, ordering }));
  }, [sortBy, sortOrder, fetchAdCreatives, buildQueryParams]);

  /**
   * Apply filters
   */
  const applyFilters = useCallback(async (newFilters: {
    status?: string;
    call_to_action_type?: string;
  }) => {
    setFilters(newFilters);
    await fetchAdCreatives(buildQueryParams({ page: 1, ...newFilters }));
  }, [fetchAdCreatives, buildQueryParams]);

  /**
   * Clear filters
   */
  const clearFilters = useCallback(async () => {
    setFilters({});
    await fetchAdCreatives(buildQueryParams({ page: 1, status: undefined, call_to_action_type: undefined }));
  }, [fetchAdCreatives, buildQueryParams]);

  return {
    // State
    adCreatives,
    currentCreative,
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
    fetchAdCreatives,
    fetchAdCreative,
    createAdCreative,
    updateAdCreative,
    deleteAdCreative,
    
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

