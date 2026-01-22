'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Plus, Search } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { useChatStore } from '@/lib/chatStore';
import { useChatData } from '@/hooks/useChatData';
import { useChatSocket } from '@/hooks/useChatSocket';
import ProjectSelector from './ProjectSelector';
import PopOutButton from './PopOutButton';
import ChatList from '@/components/chat/ChatList';
import ChatWindow from '@/components/chat/ChatWindow';
import CreateChatDialog from '@/components/chat/CreateChatDialog';
import EmptyChatState from '@/components/chat/EmptyChatState';

export default function MessagePageContent() {
  const user = useAuthStore(state => state.user);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Ensure userId is a number for consistent comparison in addMessage
  const userId = user?.id ? Number(user.id) : null;
  
  // Chat store state
  const currentChatId = useChatStore(state => state.currentChatId);
  const setCurrentChat = useChatStore(state => state.setCurrentChat);
  const chats = useChatStore(state => state.chats);
  
  // Fetch chats for selected project
  const { fetchChats, isLoading } = useChatData({
    projectId: selectedProjectId || undefined,
    autoFetch: false,
  });
  
  // Connect to WebSocket for real-time updates
  const { connected } = useChatSocket(userId, {
    onMessage: (message) => {
      console.log('[MessagePage] New message received:', message);
    },
    onOpen: () => {
      console.log('[MessagePage] WebSocket connected');
    },
    onClose: () => {
      console.warn('[MessagePage] WebSocket disconnected');
    },
  });
  
  // Fetch chats when project changes or WebSocket connects
  // Combined into one effect to prevent duplicate fetches
  const hasFetchedRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (selectedProjectId) {
      // Only fetch if we haven't fetched for this project yet, or if WebSocket just connected
      const fetchKey = `${selectedProjectId}-${connected}`;
      if (hasFetchedRef.current !== fetchKey) {
        hasFetchedRef.current = fetchKey;
        console.log('[MessagePage] Fetching chats for project:', selectedProjectId, 'connected:', connected);
        fetchChats();
      }
    }
  }, [selectedProjectId, connected, fetchChats]);
  
  // Get current chat from store
  const currentChat = chats.find(chat => chat.id === currentChatId);
  
  // Filter chats by search query
  const filteredChats = chats.filter(chat => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    
    // Search by chat name
    if (chat.name?.toLowerCase().includes(query)) return true;
    
    // Search by participant names
    const participantMatch = chat.participants.some(p => 
      p.user.username?.toLowerCase().includes(query) ||
      p.user.email?.toLowerCase().includes(query)
    );
    if (participantMatch) return true;
    
    // Search by last message content
    if (chat.last_message?.content.toLowerCase().includes(query)) return true;
    
    return false;
  });
  
  const handleSelectProject = useCallback((projectId: number) => {
    setSelectedProjectId(projectId);
    // Clear current chat when switching projects
    setCurrentChat(null);
  }, [setCurrentChat]);
  
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
    // Refresh chats to include the new one
    fetchChats();
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
            </div>
            
            {/* Project Selector */}
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onSelectProject={handleSelectProject}
            />
          </div>
          
          <div className="flex items-center gap-2">
            {/* Pop-out Button */}
            <PopOutButton />
            
            {/* New Chat Button */}
            <button
              onClick={handleCreateChat}
              disabled={!selectedProjectId}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="mt-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>
      
      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat List - Left Panel */}
        <div className="w-full max-w-sm border-r border-gray-200 bg-white flex flex-col">
          {!selectedProjectId ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div>
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Select a project to view chats</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <ChatList
              chats={filteredChats}
              currentChatId={currentChatId}
              onSelectChat={handleSelectChat}
              onCreateChat={handleCreateChat}
            />
          )}
        </div>
        
        {/* Chat Window - Right Panel */}
        <div className="flex-1 bg-white flex flex-col">
          {!selectedProjectId ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div>
                <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Select a project to start
                </h3>
                <p className="text-gray-500 text-sm max-w-sm">
                  Choose a project from the dropdown above to view and manage your team conversations.
                </p>
              </div>
            </div>
          ) : !currentChat ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div>
                <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-500 text-sm max-w-sm">
                  Choose a chat from the list or start a new conversation with your team members.
                </p>
                <button
                  onClick={handleCreateChat}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Start New Chat
                </button>
              </div>
            </div>
          ) : (
            <ChatWindow
              chat={currentChat}
              onBack={handleBackToList}
            />
          )}
        </div>
      </div>
      
      {/* Create Chat Dialog */}
      {selectedProjectId && (
        <CreateChatDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          projectId={String(selectedProjectId)}
          onChatCreated={handleChatCreated}
        />
      )}
    </div>
  );
}

