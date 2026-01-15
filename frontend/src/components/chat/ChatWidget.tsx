'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/lib/chatStore';
import { useAuthStore } from '@/lib/authStore';
import { useChatData } from '@/hooks/useChatData';
import { useChatSocket } from '@/hooks/useChatSocket';
import ChatWidgetButton from './ChatWidgetButton';
import ChatWidgetWindow from './ChatWidgetWindow';

interface ChatWidgetProps {
  projectId: string;
}

export default function ChatWidget({ projectId }: ChatWidgetProps) {
  // ✅ Use selectors for stable references
  const user = useAuthStore(state => state.user);
  const isWidgetOpen = useChatStore(state => state.isWidgetOpen);
  // ✅ Calculate unread count directly in selector to prevent infinite loop
  const unreadCount = useChatStore(state => {
    const { unreadCounts } = state;
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  });
  
  // Fetch chats for this project
  const { fetchChats } = useChatData({ projectId, autoFetch: true });
  
  // Connect to WebSocket for real-time updates
  const { connected } = useChatSocket(user?.id, {
    onMessage: (message) => {
      console.log('📩 New message received:', message);
      // Message is automatically added to store by the hook
    },
    onOpen: () => {
      console.log('✅ Chat WebSocket connected');
    },
    onClose: () => {
      console.warn('⚠️ Chat WebSocket disconnected');
    },
  });

  // Refresh chats when WebSocket connects
  useEffect(() => {
    if (connected) {
      fetchChats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]); // Don't include fetchChats to avoid infinite loop

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isWidgetOpen ? (
        <ChatWidgetWindow projectId={projectId} />
      ) : (
        <ChatWidgetButton unreadCount={unreadCount} />
      )}
    </div>
  );
}

