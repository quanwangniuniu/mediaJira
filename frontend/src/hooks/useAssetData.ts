// src/hooks/useAssetData.ts - Asset data management hook
import { useState, useEffect, useCallback } from 'react';
import { AssetAPI, Asset, AssetVersion, AssetComment, AssetAssignment, AssetHistory } from '@/lib/api/assetApi';

interface UseAssetDataProps {
  taskId?: string;
  assetId?: string;
}

interface UseAssetDataReturn {
  // Assets list
  assets: Asset[];
  assetsLoading: boolean;
  assetsError: string | null;
  
  // Single asset
  asset: Asset | null;
  assetLoading: boolean;
  assetError: string | null;
  
  // Asset details
  versions: AssetVersion[];
  comments: AssetComment[];
  assignments: AssetAssignment[];
  history: AssetHistory[];
  
  // Loading states
  versionsLoading: boolean;
  commentsLoading: boolean;
  assignmentsLoading: boolean;
  historyLoading: boolean;
  
  // Actions
  fetchAssets: () => Promise<void>;
  fetchAsset: (id: string) => Promise<void>;
  fetchAssetDetails: (id: string) => Promise<void>;
  createAsset: (data: any) => Promise<Asset | null>;
  deleteAsset: (id: string) => Promise<boolean>;
  createAssetVersion: (assetId: string, payload: { file: File }) => Promise<AssetVersion | null>;
  createComment: (assetId: string, body: string) => Promise<AssetComment | null>;
  refreshAssetDetails: () => Promise<void>;
  // Local update helper for WS-driven list updates
  updateAssetLocal: (id: string | number, patch: Partial<Asset>) => void;
}

export const useAssetData = ({ taskId, assetId }: UseAssetDataProps = {}): UseAssetDataReturn => {
  // Assets list state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  // Single asset state
  const [asset, setAsset] = useState<Asset | null>(null);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  // Asset details state
  const [versions, setVersions] = useState<AssetVersion[]>([]);
  const [comments, setComments] = useState<AssetComment[]>([]);
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [history, setHistory] = useState<AssetHistory[]>([]);

  // Loading states
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch assets list
  const fetchAssets = useCallback(async () => {
    if (!taskId) return;
    
    try {
      setAssetsLoading(true);
      setAssetsError(null);
      const response = await AssetAPI.getAssets(taskId);
      setAssets(response.results || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
      setAssetsError('Failed to load assets');
      setAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  }, [taskId]);

  // Fetch single asset
  const fetchAsset = useCallback(async (id: string) => {
    try {
      setAssetLoading(true);
      setAssetError(null);
      const assetData = await AssetAPI.getAsset(id);
      setAsset(assetData);
    } catch (error) {
      console.error('Error fetching asset:', error);
      setAssetError('Failed to load asset details');
      setAsset(null);
    } finally {
      setAssetLoading(false);
    }
  }, []);

  // Fetch asset details (versions, comments, assignments, history)
  const fetchAssetDetails = useCallback(async (id: string) => {
    // Fetch versions
    setVersionsLoading(true);
    try {
      const versionsData = await AssetAPI.getAssetVersions(id);
      setVersions(versionsData);
    } catch (error) {
      console.error('Error fetching versions:', error);
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }

    // Fetch comments
    setCommentsLoading(true);
    try {
      const commentsData = await AssetAPI.getAssetComments(id);
      setComments(commentsData);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }

    // Fetch assignments
    setAssignmentsLoading(true);
    try {
      const assignmentsData = await AssetAPI.getAssetAssignments(id);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }

    // Fetch history
    setHistoryLoading(true);
    try {
      const historyData = await AssetAPI.getAssetHistory(id);
      setHistory(historyData);
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Create asset
  const createAsset = useCallback(async (data: any): Promise<Asset | null> => {
    try {
      const newAsset = await AssetAPI.createAsset(data);
      // Append locally instead of refetching the entire list
      setAssets(prev => [newAsset, ...prev]);
      return newAsset;
    } catch (error) {
      console.error('Error creating asset:', error);
      return null;
    }
  }, [fetchAssets]);

  // Delete asset
  const deleteAsset = useCallback(async (id: string): Promise<boolean> => {
    try {
      await AssetAPI.deleteAsset(id);
      // Remove locally instead of refetching the entire list
      setAssets(prev => prev.filter(a => String(a.id) !== String(id)));
      return true;
    } catch (error) {
      console.error('Error deleting asset:', error);
      return false;
    }
  }, [fetchAssets]);

  // Local list update helper for WS-driven UI (no refetch)
  const updateAssetLocal = useCallback((id: string | number, patch: Partial<Asset>) => {
    setAssets(prev => prev.map(a => (String(a.id) === String(id) ? { ...a, ...patch } : a)));
    setAsset(curr => (curr && String(curr.id) === String(id) ? { ...curr, ...patch } as Asset : curr));
  }, []);

  // Create asset version
  const createAssetVersion = useCallback(async (
    assetId: string,
    payload: { file: File }
  ): Promise<AssetVersion | null> => {
    try {
      const version = await AssetAPI.createAssetVersion(assetId, payload);
      // Refresh versions/comments/etc
      await fetchAssetDetails(assetId);
      return version;
    } catch (error) {
      console.error('Error creating asset version:', error);
      return null;
    }
  }, [fetchAssetDetails]);

  // Create comment
  const createComment = useCallback(async (
    assetId: string,
    body: string
  ): Promise<AssetComment | null> => {
    try {
      const comment = await AssetAPI.createAssetComment(assetId, { body });
      // Optionally refresh comments list
      await fetchAssetDetails(assetId);
      return comment;
    } catch (error) {
      console.error('Error creating comment:', error);
      return null;
    }
  }, [fetchAssetDetails]);

  // Refresh asset details
  const refreshAssetDetails = useCallback(async () => {
    if (assetId) {
      await fetchAssetDetails(assetId);
    }
  }, [assetId, fetchAssetDetails]);

  // Initial data loading
  useEffect(() => {
    if (taskId) {
      fetchAssets();
    }
  }, [taskId, fetchAssets]);

  useEffect(() => {
    if (assetId) {
      fetchAsset(assetId);
      fetchAssetDetails(assetId);
    }
  }, [assetId, fetchAsset, fetchAssetDetails]);

  return {
    // Assets list
    assets,
    assetsLoading,
    assetsError,
    
    // Single asset
    asset,
    assetLoading,
    assetError,
    
    // Asset details
    versions,
    comments,
    assignments,
    history,
    
    // Loading states
    versionsLoading,
    commentsLoading,
    assignmentsLoading,
    historyLoading,
    
    // Actions
    fetchAssets,
    fetchAsset,
    fetchAssetDetails,
    createAsset,
    deleteAsset,
    createAssetVersion,
    createComment,
    refreshAssetDetails,
    updateAssetLocal,
  };
};
