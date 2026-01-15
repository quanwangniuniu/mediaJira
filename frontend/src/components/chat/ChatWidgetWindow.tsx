'use client';

import { useState, useEffect } from 'react';
import { X, Minus } from 'lucide-react';
import { useChatStore } from '@/lib/chatStore';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import CreateChatDialog from './CreateChatDialog';

interface ChatWidgetWindowProps {
  projectId: string;
}

export default function ChatWidgetWindow({ projectId }: ChatWidgetWindowProps) {
  // ✅ Use selectors to get stable references
  const closeWidget = useChatStore(state => state.closeWidget);
  const currentView = useChatStore(state => state.currentView);
  const currentChatId = useChatStore(state => state.currentChatId);
  const setCurrentChat = useChatStore(state => state.setCurrentChat);
  const chats = useChatStore(state => state.chats);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // ✅ Get current chat directly from chats array instead of calling getCurrentChat()
  const currentChat = chats.find(chat => chat.id === currentChatId);
  
  // ✅ If currentChatId is set but chat not found (e.g., after page refresh), go back to list
  useEffect(() => {
    if (currentChatId && !currentChat && chats.length > 0) {
      console.warn('[ChatWidgetWindow] Chat not found, returning to list. ChatId:', currentChatId);
      setCurrentChat(null);
    }
  }, [currentChatId, currentChat, chats.length, setCurrentChat]);
  
  const handleSelectChat = (chatId: number) => {
    setCurrentChat(chatId);
  };
  
  const handleBackToList = () => {
    setCurrentChat(null);
  };
  
  const handleCreateChat = () => {
    setIsCreateDialogOpen(true);
  };
  
  const handleChatCreated = (chatId: number) => {
    setIsCreateDialogOpen(false);
    setCurrentChat(chatId);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-2xl w-[380px] h-[600px] flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
          <h2 className="font-semibold text-lg">
            {currentView === 'chat' && currentChat ? currentChat.name || 'Chat' : 'Chats'}
          </h2>
          <div className="flex items-center gap-2">
            {/* Minimize Button */}
            <button
              onClick={closeWidget}
              className="hover:bg-blue-700 rounded p-1 transition-colors"
              aria-label="Minimize"
              title="Minimize"
            >
              <Minus className="w-4 h-4" />
            </button>
            {/* Close Button */}
            <button
              onClick={closeWidget}
              className="hover:bg-blue-700 rounded p-1 transition-colors"
              aria-label="Close"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {currentView === 'list' ? (
            <ChatList
              chats={chats}
              currentChatId={currentChatId}
              onSelectChat={handleSelectChat}
              onCreateChat={handleCreateChat}
            />
          ) : currentChat ? (
            <ChatWindow
              chat={currentChat}
              onBack={handleBackToList}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Select a chat to start messaging</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Chat Dialog */}
      <CreateChatDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        projectId={projectId}
        onChatCreated={handleChatCreated}
      />
    </>
  );
}

