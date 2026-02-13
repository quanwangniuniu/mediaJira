'use client';

import { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { useMessageData } from '@/hooks/useMessageData';
import { useChatStore } from '@/lib/chatStore';
import type { Chat } from '@/types/chat';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

interface ChatWindowProps {
  chat: Chat;
  onBack: () => void;
  roleByUserId?: Record<number, string>;
}

export default function ChatWindow({ chat, onBack, roleByUserId }: ChatWindowProps) {
  // Use selector for stable reference
  const user = useAuthStore(state => state.user);
  const {
    messages,
    isLoadingMessages,
    isSending,
    hasMore,
    send,
    sendWithAttachments,
    loadMoreMessages,
    markAllAsRead,
  } = useMessageData({ chatId: chat.id, autoFetch: true });
  
  // Track last message count to detect new messages
  const lastMessageCountRef = useRef<number>(0);
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Mark messages as read when viewing - both on open AND when new messages arrive
  useEffect(() => {
    if (!chat.id || messages.length === 0) return;
      
    // Get store actions
    const { updateChat, updateUnreadCount, fetchGlobalUnreadCount } = useChatStore.getState();
    
    // Always keep local unread count at 0 while viewing (optimistic update)
    updateChat(chat.id, { unread_count: 0 });
    updateUnreadCount(chat.id, 0);
    
    // Debounce the API call to avoid too many requests when messages stream in
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
    }
    
    // Only call API if this is initial load OR new messages arrived
    if (messages.length > lastMessageCountRef.current) {
      console.log('[ChatWindow] New messages detected, scheduling markAllAsRead:', {
        chatId: chat.id,
        previousCount: lastMessageCountRef.current,
        newCount: messages.length,
      });
      
      markAsReadTimeoutRef.current = setTimeout(() => {
        markAllAsRead().then(() => {
          console.log('[ChatWindow] markAllAsRead completed for chat:', chat.id);
          // Refetch global unread count from backend to ensure accuracy
          fetchGlobalUnreadCount();
        });
      }, 500); // Debounce 500ms
    }
    
    lastMessageCountRef.current = messages.length;
    
    // Cleanup timeout on unmount
    return () => {
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }
    };
  }, [chat.id, messages.length, markAllAsRead]);
  
  const handleSendMessage = async (content: string) => {
    await send(content);
  };

  const handleSendWithAttachments = async (content: string, attachmentIds: number[]) => {
    await sendWithAttachments(content, attachmentIds);
  };

  // Get the other participant (not current user) for private chats
  const getOtherParticipant = () => {
    if (chat.type === 'group' || !chat.participants) return null;
    // Ensure numeric comparison to avoid type mismatch (user.id can be string | number | undefined)
    const currentUserId = user?.id ? Number(user.id) : null;
    if (currentUserId === null) return null;
    return chat.participants.find(p => p.user.id !== currentUserId);
  };

  const otherParticipant = getOtherParticipant();
  const otherParticipantRole =
    chat.type === 'private' && otherParticipant?.user?.id
      ? roleByUserId?.[otherParticipant.user.id]
      : undefined;
  const chatName = chat.type === 'group' 
    ? (chat.name || 'Group Chat')
    : (otherParticipant?.user?.username || 'Chat');

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3 flex-shrink-0 bg-white">
        <button
          onClick={onBack}
          className="hover:bg-gray-100 rounded p-1 transition-colors"
          aria-label="Back to chat list"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {chatName}
            </h3>
            {chat.type === 'private' && otherParticipantRole && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded flex-shrink-0">
                {otherParticipantRole}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          currentUserId={user?.id ? Number(user.id) : 0}
          onLoadMore={loadMoreMessages}
          hasMore={hasMore}
          isLoading={isLoadingMessages}
          roleByUserId={roleByUserId}
          isGroupChat={chat.type === 'group'}
        />
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0">
        <MessageInput 
          onSend={handleSendMessage} 
          onSendWithAttachments={handleSendWithAttachments}
          disabled={isSending} 
        />
      </div>
    </div>
  );
}
