'use client';

import { ExternalLink } from 'lucide-react';
import { useChatStore } from '@/lib/chatStore';
import { useRouter } from 'next/navigation';

interface PopOutButtonProps {
  className?: string;
}

// Key for sessionStorage - used to pass pop-out intent across navigation
export const POPOUT_STORAGE_KEY = 'chat_popout_pending';

// Flag to prevent cleanup effect from interfering with pop-out
let isPopOutTriggered = false;

export function resetPopOutFlag() {
  isPopOutTriggered = false;
}

export function wasPopOutTriggered() {
  return isPopOutTriggered;
}

export default function PopOutButton({ className = '' }: PopOutButtonProps) {
  const router = useRouter();

  const handlePopOut = () => {
    // Set flag to prevent cleanup from interfering
    isPopOutTriggered = true;
    
    // Get fresh state
    const store = useChatStore.getState();
    const currentChatId = store.currentChatId;
    const selectedProjectId = store.selectedProjectId;
    
    // IMPORTANT: Use sessionStorage to pass pop-out intent across navigation
    // This is synchronous and works reliably in both Chrome and Safari
    // (Unlike localStorage which Safari may not complete before navigation)
    try {
      sessionStorage.setItem(POPOUT_STORAGE_KEY, JSON.stringify({
        isWidgetOpen: true,
        currentChatId: currentChatId,
        currentView: currentChatId ? 'chat' : 'list',
        selectedProjectId: selectedProjectId,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.error('Failed to set sessionStorage:', e);
    }
    
    // Also update Zustand state (for components that are already mounted)
    useChatStore.setState({
      isMessagePageOpen: false,
      isWidgetOpen: true,
      currentChatId: currentChatId,
      currentView: currentChatId ? 'chat' : 'list',
    });
    
    // Navigate back immediately - sessionStorage write is synchronous
    router.back();
    
    // Reset flag after navigation
    setTimeout(() => {
      isPopOutTriggered = false;
    }, 500);
  };

  return (
    <button
      onClick={handlePopOut}
      className={`
        flex items-center gap-2 px-3 py-2 text-sm font-medium
        text-gray-600 hover:text-gray-900 hover:bg-gray-100
        rounded-lg transition-colors border border-gray-200
        ${className}
      `}
      title="Open in floating window"
    >
      <ExternalLink className="w-4 h-4" />
      <span className="hidden sm:inline">Pop-out</span>
    </button>
  );
}

