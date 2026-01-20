'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/lib/chatStore';
import { useAuthStore } from '@/lib/authStore';
import { useChatData } from '@/hooks/useChatData';
import { useChatSocket } from '@/hooks/useChatSocket';
import ChatWidgetButton from './ChatWidgetButton';
import ChatWidgetWindow from './ChatWidgetWindow';
import { POPOUT_STORAGE_KEY } from '@/components/messages/PopOutButton';

interface ChatWidgetProps {
  // Optional: If provided, auto-switch to this project (from URL context)
  contextProjectId?: string | number | null;
}

// Helper to get and consume popout data
function consumePopoutData(): { isWidgetOpen: boolean; currentChatId: number | null; currentView: string; selectedProjectId: number | null } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = sessionStorage.getItem(POPOUT_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Only use if recent (within 10 seconds - increased for Safari)
      if (parsed.timestamp && Date.now() - parsed.timestamp < 10000) {
        // Remove after reading
        sessionStorage.removeItem(POPOUT_STORAGE_KEY);
        console.log('[ChatWidget] Found popout data:', parsed);
        return parsed;
      }
      // Clean up stale data
      sessionStorage.removeItem(POPOUT_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to read sessionStorage:', e);
  }
  return null;
}

export default function ChatWidget({ contextProjectId }: ChatWidgetProps = {}) {
  // Use selectors for stable references
  const user = useAuthStore(state => state.user);
  const isWidgetOpen = useChatStore(state => state.isWidgetOpen);
  const isMessagePageOpen = useChatStore(state => state.isMessagePageOpen);
  const selectedProjectId = useChatStore(state => state.selectedProjectId);
  const setSelectedProjectId = useChatStore(state => state.setSelectedProjectId);
  
  // Track if component has mounted (for SSR/hydration safety)
  const [isMounted, setIsMounted] = useState(false);
  
  // Track if we have pending popout (checked after mount)
  const [hasPopoutPending, setHasPopoutPending] = useState(false);
  
  // Track if we've processed the popout
  const processedRef = useRef(false);
  
  // Check for popout on mount and handle Safari bfcache
  useEffect(() => {
    setIsMounted(true);
    
    // Check sessionStorage immediately on mount
    const checkAndApplyPopout = () => {
      const popoutData = consumePopoutData();
      if (popoutData && !processedRef.current) {
        processedRef.current = true;
        setHasPopoutPending(true);
        
        console.log('[ChatWidget] Applying pop-out state:', popoutData);
        
        // Apply the saved state
        const currentView = popoutData.currentView === 'chat' ? 'chat' : 'list';
        useChatStore.setState({
          isWidgetOpen: popoutData.isWidgetOpen ?? true,
          currentChatId: popoutData.currentChatId ?? null,
          currentView: currentView,
          selectedProjectId: popoutData.selectedProjectId ?? selectedProjectId,
          isMessagePageOpen: false, // Critical: ensure message page is marked closed
        });
        
        // Clear the pending state after a short delay
        setTimeout(() => {
          setHasPopoutPending(false);
          processedRef.current = false;
        }, 500);
      }
    };
    
    // Check immediately
    checkAndApplyPopout();
    
    // Also handle Safari's bfcache (pageshow event fires when returning via back button)
    const handlePageShow = (event: PageTransitionEvent) => {
      // event.persisted is true when page is restored from bfcache
      if (event.persisted) {
        console.log('[ChatWidget] Page restored from bfcache, checking popout...');
        processedRef.current = false; // Reset so we can process again
        checkAndApplyPopout();
      }
    };
    
    window.addEventListener('pageshow', handlePageShow);
    
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [selectedProjectId]);
  
  // Calculate unread count directly in selector to prevent infinite loop
  const unreadCount = useChatStore(state => {
    const { unreadCounts } = state;
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  });
  
  // Auto-switch to context project (Option A: from URL)
  useEffect(() => {
    if (contextProjectId) {
      const projectIdNum = typeof contextProjectId === 'string' 
        ? parseInt(contextProjectId, 10) 
        : contextProjectId;
      if (projectIdNum && !isNaN(projectIdNum) && projectIdNum !== selectedProjectId) {
        setSelectedProjectId(projectIdNum);
      }
    }
  }, [contextProjectId, selectedProjectId, setSelectedProjectId]);
  
  // Use selected project from store (or context project if no selection)
  const effectiveProjectId = selectedProjectId 
    ? String(selectedProjectId) 
    : contextProjectId 
      ? String(contextProjectId) 
      : undefined;
  
  // Fetch chats for the selected project
  // Only auto-fetch if widget is active (message page NOT open)
  const { fetchChats } = useChatData({ 
    projectId: effectiveProjectId, 
    autoFetch: !!effectiveProjectId && !isMessagePageOpen
  });
  
  // Connect to WebSocket for real-time updates
  // IMPORTANT: Disable WebSocket when message page is open to avoid duplicate handlers
  // MessagePageContent has its own WebSocket connection
  const userId = user?.id ? Number(user.id) : null;
  const { connected } = useChatSocket(
    // Pass null userId when message page is open to disable this socket
    isMessagePageOpen ? null : userId, 
    {
      onMessage: (message) => {
        console.log('[ChatWidget] New message received:', message);
        // Message is automatically added to store by the hook
      },
      onOpen: () => {
        console.log('[ChatWidget] Chat WebSocket connected');
      },
      onClose: () => {
        console.warn('[ChatWidget] Chat WebSocket disconnected');
      },
    }
  );

  // Refresh chats when WebSocket connects or project changes
  useEffect(() => {
    if (connected && effectiveProjectId) {
      fetchChats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, effectiveProjectId]); // Don't include fetchChats to avoid infinite loop

  // Don't render during SSR (wait for mount to check sessionStorage)
  if (!isMounted) {
    return null;
  }
  
  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }
  
  // Don't render widget when message page is open
  // UNLESS there's a pop-out pending (user clicked pop-out button)
  if (isMessagePageOpen && !hasPopoutPending) {
    return null;
  }

  // If pop-out is pending, force show the widget window
  const shouldShowWindow = isWidgetOpen || hasPopoutPending;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {shouldShowWindow ? (
        <ChatWidgetWindow projectId={effectiveProjectId} />
      ) : (
        <ChatWidgetButton unreadCount={unreadCount} />
      )}
    </div>
  );
}

