'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/lib/chatStore';
import { useAuthStore } from '@/lib/authStore';
import { useChatData } from '@/hooks/useChatData';
import { useChatSocket } from '@/hooks/useChatSocket';
import ChatWidgetButton from './ChatWidgetButton';
import ChatWidgetWindow from './ChatWidgetWindow';

interface ChatWidgetProps {
  // Optional: If provided, auto-switch to this project (from URL context)
  contextProjectId?: string | number | null;
}

export default function ChatWidget({ contextProjectId }: ChatWidgetProps = {}) {
  // Use selectors for stable references
  const user = useAuthStore(state => state.user);
  const isWidgetOpen = useChatStore(state => state.isWidgetOpen);
  // Use widget-specific project ID (independent from Messages page)
  const widgetProjectId = useChatStore(state => state.widgetProjectId);
  const setWidgetProjectId = useChatStore(state => state.setWidgetProjectId);
  
  // Track if component has mounted (for SSR/hydration safety)
  const [isMounted, setIsMounted] = useState(false);
  
  // Set mounted on client
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Use global unread count (across ALL projects) for the badge
  const globalUnreadCount = useChatStore(state => state.globalUnreadCount);
  const fetchGlobalUnreadCount = useChatStore(state => state.fetchGlobalUnreadCount);
  
  // Fetch global unread count on mount (for initial login)
  useEffect(() => {
    if (user && isMounted) {
      fetchGlobalUnreadCount();
    }
  }, [user, isMounted, fetchGlobalUnreadCount]);
  
  // Auto-switch to context project (Option A: from URL)
  useEffect(() => {
    if (contextProjectId) {
      const projectIdNum = typeof contextProjectId === 'string' 
        ? parseInt(contextProjectId, 10) 
        : contextProjectId;
      if (projectIdNum && !isNaN(projectIdNum) && projectIdNum !== widgetProjectId) {
        setWidgetProjectId(projectIdNum);
      }
    }
  }, [contextProjectId, widgetProjectId, setWidgetProjectId]);
  
  // Use widget's project from store (or context project if no selection)
  const effectiveProjectId = widgetProjectId 
    ? String(widgetProjectId) 
    : contextProjectId 
      ? String(contextProjectId) 
      : undefined;
  
  // Fetch chats for the widget's selected project
  const { fetchChats } = useChatData({ 
    projectId: effectiveProjectId, 
    autoFetch: !!effectiveProjectId
  });
  
  // Connect to WebSocket for real-time updates
  const userId = user?.id ? Number(user.id) : null;
  const { connected } = useChatSocket(userId, {
    onMessage: (message) => {
      console.log('[ChatWidget] New message received:', message);
    },
    onOpen: () => {
      console.log('[ChatWidget] Chat WebSocket connected');
    },
    onClose: () => {
      console.warn('[ChatWidget] Chat WebSocket disconnected');
    },
  });

  // Refresh chats when WebSocket connects or project changes
  useEffect(() => {
    if (connected && effectiveProjectId) {
      fetchChats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, effectiveProjectId]); // Don't include fetchChats to avoid infinite loop

  // Don't render during SSR
  if (!isMounted) {
    return null;
  }
  
  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className={`fixed bottom-20 z-50 ${isWidgetOpen ? 'right-4' : 'right-0'}`}>
      {isWidgetOpen ? (
        <ChatWidgetWindow projectId={effectiveProjectId} />
      ) : (
        <ChatWidgetButton unreadCount={globalUnreadCount} />
      )}
    </div>
  );
}

