'use client';

import { useEffect, useState, useCallback } from 'react';
import { useChatStore } from '@/lib/chatStore';
import { getChats, createChat } from '@/lib/api/chatApi';
import type { CreateChatRequest, Chat } from '@/types/chat';
import toast from 'react-hot-toast';

interface UseChatDataOptions {
  projectId?: string | number;
  autoFetch?: boolean;
}

export function useChatData(options: UseChatDataOptions = {}) {
  const { projectId, autoFetch = true } = options;
  
  // Get reactive state only
  const chats = useChatStore(state => state.chats);
  const isLoading = useChatStore(state => state.isLoading);
  
  const [error, setError] = useState<string | null>(null);

  // Fetch chats
  const fetchChats = useCallback(async () => {
    if (!projectId) return;
    
    // Get fresh actions from store
    const { setChats, setLoading } = useChatStore.getState();
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await getChats({
        project_id: Number(projectId),
        limit: 100,
      });
      
      setChats(response.results);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || 'Failed to load chats';
      setError(errorMsg);
      console.error('Error fetching chats:', err);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Create new chat
  const createNewChat = useCallback(async (data: CreateChatRequest): Promise<Chat | null> => {
    // Get fresh actions from store
    const { addChat, setLoading } = useChatStore.getState();
    
    try {
      setLoading(true);
      setError(null);
      
      const newChat = await createChat(data);
      
      // Add to store
      addChat(newChat);
      
      toast.success(
        newChat.type === 'private' 
          ? 'Private chat created!' 
          : 'Group chat created!'
      );
      
      return newChat;
    } catch (err: any) {
      const errorMsg = err?.response?.data?.detail || 'Failed to create chat';
      setError(errorMsg);
      console.error('Error creating chat:', err);
      toast.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh chats
  const refreshChats = useCallback(() => {
    fetchChats();
  }, [fetchChats]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && projectId) {
      fetchChats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, projectId]); // Don't include fetchChats to avoid infinite loop

  return {
    chats,
    isLoading,
    error,
    fetchChats,
    createNewChat,
    refreshChats,
  };
}

