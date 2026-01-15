'use client';

import { MessageCircle } from 'lucide-react';
import { useChatStore } from '@/lib/chatStore';

interface ChatWidgetButtonProps {
  unreadCount: number;
}

export default function ChatWidgetButton({ unreadCount }: ChatWidgetButtonProps) {
  const { openWidget } = useChatStore();

  return (
    <button
      onClick={openWidget}
      className="relative bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label="Open chat"
      title="Open chat"
    >
      {/* Chat Icon */}
      <MessageCircle className="w-6 h-6" />
      
      {/* Unread Badge */}
      {unreadCount > 0 && (
        <span 
          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-md animate-pulse"
          aria-label={`${unreadCount} unread messages`}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

