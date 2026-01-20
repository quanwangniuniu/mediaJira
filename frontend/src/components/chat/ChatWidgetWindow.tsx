'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Minus, Maximize2, ChevronDown, FolderOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/lib/chatStore';
import { ProjectAPI } from '@/lib/api/projectApi';
import type { ProjectData } from '@/types/project';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import CreateChatDialog from './CreateChatDialog';

interface ChatWidgetWindowProps {
  projectId?: string;
}

export default function ChatWidgetWindow({ projectId }: ChatWidgetWindowProps) {
  const router = useRouter();
  
  // Use selectors to get stable references
  const closeWidget = useChatStore(state => state.closeWidget);
  const currentView = useChatStore(state => state.currentView);
  const currentChatId = useChatStore(state => state.currentChatId);
  const setCurrentChat = useChatStore(state => state.setCurrentChat);
  const setMessagePageOpen = useChatStore(state => state.setMessagePageOpen);
  const chats = useChatStore(state => state.chats);
  const selectedProjectId = useChatStore(state => state.selectedProjectId);
  const setSelectedProjectId = useChatStore(state => state.setSelectedProjectId);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Fetch projects for selector
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const fetchedProjects = await ProjectAPI.getProjects();
        setProjects(fetchedProjects);
        
        // If no project selected and we have projects, select the first one
        if (!selectedProjectId && fetchedProjects.length > 0) {
          setSelectedProjectId(fetchedProjects[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch projects for chat widget:', error);
      }
    };
    fetchProjects();
  }, [selectedProjectId, setSelectedProjectId]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Get current project name
  const currentProject = projects.find(p => p.id === selectedProjectId);
  const currentProjectName = currentProject?.name || 'Select Project';
  
  // Get current chat directly from chats array instead of calling getCurrentChat()
  const currentChat = chats.find(chat => chat.id === currentChatId);
  
  // If currentChatId is set but chat not found (e.g., after page refresh), go back to list
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
  
  const handleOpenMessagesPage = () => {
    // Close the widget and open the messages page
    closeWidget();
    setMessagePageOpen(true);
    router.push('/messages');
  };

  const handleProjectSelect = (project: ProjectData) => {
    setSelectedProjectId(project.id);
    setIsProjectDropdownOpen(false);
    // Clear current chat when switching projects
    setCurrentChat(null);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-2xl w-[380px] h-[600px] flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-3 flex flex-col gap-2 flex-shrink-0">
          {/* Top row: Title and controls */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">
              {currentView === 'chat' && currentChat ? currentChat.name || 'Chat' : 'Chats'}
            </h2>
            <div className="flex items-center gap-1">
              {/* Expand to Messages Page Button */}
              <button
                onClick={handleOpenMessagesPage}
                className="hover:bg-blue-700 rounded p-1.5 transition-colors"
                aria-label="Open in Messages page"
                title="Open full Messages page"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              {/* Minimize Button */}
              <button
                onClick={closeWidget}
                className="hover:bg-blue-700 rounded p-1.5 transition-colors"
                aria-label="Minimize"
                title="Minimize"
              >
                <Minus className="w-4 h-4" />
              </button>
              {/* Close Button */}
              <button
                onClick={closeWidget}
                className="hover:bg-blue-700 rounded p-1.5 transition-colors"
                aria-label="Close"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Project Selector Row */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center gap-2 w-full px-2 py-1.5 bg-blue-700 hover:bg-blue-800 rounded text-sm transition-colors"
            >
              <FolderOpen className="w-4 h-4 flex-shrink-0" />
              <span className="truncate flex-1 text-left">{currentProjectName}</span>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown */}
            {isProjectDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto z-50">
                {projects.length === 0 ? (
                  <div className="px-3 py-2 text-gray-500 text-sm">No projects found</div>
                ) : (
                  projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelect(project)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors flex items-center gap-2 ${
                        project.id === selectedProjectId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <FolderOpen className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{project.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
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
        projectId={selectedProjectId ? String(selectedProjectId) : projectId || ''}
        onChatCreated={handleChatCreated}
      />
    </>
  );
}

