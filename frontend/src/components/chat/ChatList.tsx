'use client';

import { Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatListProps } from '@/types/chat';
import ChatListItem from './ChatListItem';
import EmptyChatState from './EmptyChatState';

export default function ChatList({
  chats,
  currentChatId,
  onSelectChat,
  onCreateChat,
}: ChatListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Chat List */}
      <ScrollArea className="flex-1">
        {chats.length === 0 ? (
          <EmptyChatState onCreateChat={onCreateChat} />
        ) : (
          <div className="divide-y divide-gray-100">
            {chats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === currentChatId}
                onClick={() => onSelectChat(chat.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Create Chat Button */}
      <div className="p-3 border-t border-gray-200 flex-shrink-0">
        <button
          onClick={onCreateChat}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>
    </div>
  );
}

