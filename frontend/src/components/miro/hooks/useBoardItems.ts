import { useState, useCallback } from 'react';
import { miroApi, BoardItem, CreateBoardItemData, UpdateBoardItemData } from '@/lib/api/miroApi';

export function useBoardItems(boardId: string) {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Load items
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const boardItems = await miroApi.getBoardItems(boardId);
      setItems(boardItems);
    } catch (err: any) {
      console.error('Failed to load board items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  // Create item
  const createItem = useCallback(
    async (data: CreateBoardItemData) => {
      try {
        const newItem = await miroApi.createBoardItem(boardId, data);
        setItems((prev) => [...prev, newItem]);
        return newItem;
      } catch (err: any) {
        console.error('Failed to create item:', err);
        throw err;
      }
    },
    [boardId]
  );

  // Update item (async, waits for API)
  const updateItem = useCallback(async (itemId: string, data: UpdateBoardItemData) => {
    try {
      if (!itemId) {
        throw new Error('updateItem called without itemId');
      }
      const updatedItem = await miroApi.updateBoardItem(itemId, data);
      setItems((prev) => prev.map((item) => (item.id === itemId ? updatedItem : item)));
      return updatedItem;
    } catch (err: any) {
      console.error('Failed to update item:', err);
      throw err;
    }
  }, []);

  // Optimistic update item (immediately update local state, return rollback function)
  const updateItemOptimistic = useCallback((itemId: string, data: UpdateBoardItemData) => {
    if (!itemId) {
      throw new Error('updateItemOptimistic called without itemId');
    }

    // Store previous item for rollback
    let previousItem: BoardItem | null = null;
    setItems((prev) => {
      const item = prev.find((i) => i.id === itemId);
      if (!item) {
        console.warn(`Item ${itemId} not found for optimistic update`);
        return prev;
      }
      previousItem = item;
      return prev.map((i) =>
        i.id === itemId ? { ...i, ...data } : i
      );
    });

    // Return rollback function
    return () => {
      if (previousItem) {
        setItems((prev) => prev.map((item) => (item.id === itemId ? previousItem! : item)));
      }
    };
  }, []);

  // Async update item (background PATCH, calls rollback on failure)
  const updateItemAsync = useCallback(async (
    itemId: string,
    data: UpdateBoardItemData,
    rollback: () => void
  ) => {
    try {
      const updatedItem = await miroApi.updateBoardItem(itemId, data);
      setItems((prev) => prev.map((item) => (item.id === itemId ? updatedItem : item)));
      return updatedItem;
    } catch (err: any) {
      console.error('Failed to update item (rolling back):', err);
      rollback();
      throw err;
    }
  }, []);

  // Delete item
  const deleteItem = useCallback(async (itemId: string) => {
    try {
      if (!itemId) {
        throw new Error('deleteItem called without itemId');
      }
      await miroApi.deleteBoardItem(itemId);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      if (selectedItemId === itemId) {
        setSelectedItemId(null);
      }
    } catch (err: any) {
      console.error('Failed to delete item:', err);
      throw err;
    }
  }, [selectedItemId]);

  // Batch update items
  const batchUpdateItems = useCallback(
    async (updates: Array<{ id: string } & Partial<UpdateBoardItemData>>) => {
      try {
        const result = await miroApi.batchUpdateBoardItems(boardId, updates);
        // Update local state with successful updates
        setItems((prev) => {
          const updatedMap = new Map(result.updated.map((item) => [item.id, item]));
          return prev.map((item) => updatedMap.get(item.id) || item);
        });
        return result;
      } catch (err: any) {
        console.error('Failed to batch update items:', err);
        throw err;
      }
    },
    [boardId]
  );

  return {
    items,
    loading,
    error,
    selectedItemId,
    setSelectedItemId,
    loadItems,
    createItem,
    updateItem,
    updateItemOptimistic,
    updateItemAsync,
    deleteItem,
    batchUpdateItems,
  };
}

