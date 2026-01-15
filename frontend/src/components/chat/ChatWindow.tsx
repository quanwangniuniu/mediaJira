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
}

export default function ChatWindow({ chat, onBack }: ChatWindowProps) {
  // ✅ Use selector for stable reference
  const user = useAuthStore(state => state.user);
  const {
    messages,
    isLoadingMessages,
    isSending,
    hasMore,
    send,
    loadMoreMessages,
    markAllAsRead,
  } = useMessageData({ chatId: chat.id, autoFetch: true });
  
  // Track if we've already marked this chat as read
  const markedAsReadRef = useRef<number | null>(null);
  
  // Mark messages as read when chat is opened and messages are loaded
  useEffect(() => {
    if (chat.id && messages.length > 0 && markedAsReadRef.current !== chat.id) {
      markedAsReadRef.current = chat.id;
      markAllAsRead();
      
      // Update the chat's unread count in the store
      const { updateChat } = useChatStore.getState();
      updateChat(chat.id, { unread_count: 0 });
    }
  }, [chat.id, messages.length, markAllAsRead]);
  
  const handleSendMessage = async (content: string) => {
    await send(content);
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
          <h3 className="font-semibold text-gray-900">
            {chatName}
          </h3>
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
        />
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0">
        <MessageInput onSend={handleSendMessage} disabled={isSending} />
      </div>
    </div>
  );
}

