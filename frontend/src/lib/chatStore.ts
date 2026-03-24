// Chat state management with Zustand
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatState, Chat, Message } from '@/types/chat';
import { getUnreadCount } from './api/chatApi';

const resolveChatProjectId = (chat: Chat): number | null => {
  const rawProjectId = chat.project_id ?? chat.project;
  const parsed = Number(rawProjectId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const normalizeChatProject = (chat: Chat, fallbackProjectId?: number): Chat => {
  const projectId = resolveChatProjectId(chat) ?? fallbackProjectId;
  if (!projectId) {
    return chat;
  }
  return {
    ...chat,
    project_id: projectId,
    project: chat.project ?? projectId,
  };
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // ==================== Initial State ====================
      chatsByProject: {},       // Chats keyed by project_id
      currentChatId: null,      // For Messages page
      widgetChatId: null,       // For Chat Widget (independent)
      messages: {},
      unreadCounts: {},
      globalUnreadCount: 0,     // Total unread across ALL projects
      isWidgetOpen: false,
      isMessagePageOpen: false,
      selectedProjectId: null,  // For Messages page
      widgetProjectId: null,    // For Chat Widget (independent)
      currentView: 'list',      // For Messages page
      widgetView: 'list',       // For Chat Widget (independent)
      isLoading: false,

      // ==================== Chat Actions ====================
      
      setChatsForProject: (projectId: number, chats: Chat[]) => {
        // Use set() with callback to get CURRENT state at the moment of update
        // This prevents race conditions where state changes between read and write
        set(state => {
          const normalizedChats = chats.map(chat => normalizeChatProject(chat, projectId));
          const currentUnreadCounts = state.unreadCounts;
          const currentChatId = state.currentChatId;

          // Build new unread counts, but preserve local values in certain cases:
          // 1. If user is currently viewing a chat (currentChatId), keep its unread as 0
          // 2. If local unread is 0 but backend says non-zero, the user likely just read it
          //    (keep 0 to avoid "unread" reappearing after viewing)
          const newUnreadCounts: Record<number, number> = { ...currentUnreadCounts };
          normalizedChats.forEach(chat => {
            const backendCount = chat.unread_count ?? 0;
            const localCount = currentUnreadCounts[chat.id];
            
            // If this is the currently viewed chat, always keep unread as 0
            if (chat.id === currentChatId) {
              newUnreadCounts[chat.id] = 0;
            }
            // If local count is 0 (user read the messages), don't overwrite with stale backend data
            // This prevents unread count from "reappearing" after user viewed the chat
            else if (localCount === 0 && backendCount > 0) {
              newUnreadCounts[chat.id] = 0;
            }
            // Otherwise, use the higher of local or backend count
            // (WebSocket might have received new messages that backend hasn't counted yet)
            else if (localCount !== undefined) {
              newUnreadCounts[chat.id] = Math.max(localCount, backendCount);
            }
            // No local count exists, use backend value
            else {
              newUnreadCounts[chat.id] = backendCount;
            }
          });
          
          // Update chats with synced unread_count values
          const updatedChats = normalizedChats.map(chat => ({
            ...chat,
            unread_count: newUnreadCounts[chat.id] ?? chat.unread_count ?? 0,
          }));

          return { 
            chatsByProject: {
              ...state.chatsByProject,
              [projectId]: updatedChats,
            },
            unreadCounts: newUnreadCounts,
          };
        });
      },

      getChatsForProject: (projectId: number | null) => {
        if (!projectId) return [];
        return get().chatsByProject[projectId] || [];
      },

      addChat: (chat: Chat) => {
        set(state => {
          const projectId = resolveChatProjectId(chat);
          if (!projectId) {
            console.warn('[ChatStore] Unable to add chat without project id:', chat);
            return state;
          }
          const normalizedChat = normalizeChatProject(chat, projectId);
          const existingChats = state.chatsByProject[projectId] || [];
          const dedupedChats = existingChats.filter(existing => existing.id !== normalizedChat.id);

          return {
            chatsByProject: {
              ...state.chatsByProject,
              [projectId]: [normalizedChat, ...dedupedChats],
            },
            unreadCounts: {
              ...state.unreadCounts,
              [normalizedChat.id]: normalizedChat.unread_count || 0,
            },
          };
        });
      },

      removeChat: (chatId: number) => {
        set(state => {
          const newChatsByProject: Record<number, Chat[]> = {};
          Object.entries(state.chatsByProject).forEach(([projectId, chats]) => {
            newChatsByProject[Number(projectId)] = chats.filter(chat => chat.id !== chatId);
          });

          const newMessages = { ...state.messages };
          delete newMessages[chatId];

          const newUnreadCounts = { ...state.unreadCounts };
          delete newUnreadCounts[chatId];

          const clearCurrentChat = state.currentChatId === chatId;
          const clearWidgetChat = state.widgetChatId === chatId;
          const removedUnread = state.unreadCounts[chatId] || 0;

          return {
            chatsByProject: newChatsByProject,
            messages: newMessages,
            unreadCounts: newUnreadCounts,
            globalUnreadCount: Math.max(0, state.globalUnreadCount - removedUnread),
            currentChatId: clearCurrentChat ? null : state.currentChatId,
            currentView: clearCurrentChat ? 'list' : state.currentView,
            widgetChatId: clearWidgetChat ? null : state.widgetChatId,
            widgetView: clearWidgetChat ? 'list' : state.widgetView,
          };
        });
      },

      updateChat: (chatId: number, updates: Partial<Chat>) => {
        set(state => {
          const newChatsByProject = { ...state.chatsByProject };
          
          // Find and update the chat in the correct project
          Object.keys(newChatsByProject).forEach(projectIdStr => {
            const projectId = parseInt(projectIdStr);
            newChatsByProject[projectId] = newChatsByProject[projectId].map(chat =>
              chat.id === chatId ? { ...chat, ...updates } : chat
            );
          });
          
          return { chatsByProject: newChatsByProject };
        });
      },

      setCurrentChat: (chatId: number | null) => {
        // Ensure chatId is a number for consistent comparison
        const numericChatId = chatId !== null ? Number(chatId) : null;
        
        // Single atomic state update
        set(state => {
          const updates: Partial<ChatState> = {
            currentChatId: numericChatId,
            currentView: numericChatId !== null ? 'chat' : 'list',
          };
          
          // Reset unread count for this chat (both in unreadCounts AND chat.unread_count)
          if (numericChatId !== null) {
            const newUnreadCounts = { ...state.unreadCounts };
            newUnreadCounts[numericChatId] = 0;
            updates.unreadCounts = newUnreadCounts;
            
            // Also update the chat object's unread_count for consistency in all projects
            const newChatsByProject = { ...state.chatsByProject };
            Object.keys(newChatsByProject).forEach(projectIdStr => {
              const projectId = parseInt(projectIdStr);
              newChatsByProject[projectId] = newChatsByProject[projectId].map(chat =>
                Number(chat.id) === numericChatId ? { ...chat, unread_count: 0 } : chat
              );
            });
            updates.chatsByProject = newChatsByProject;
          }
          
          return updates;
        });
      },

      // ==================== Message Actions ====================
      
      setMessages: (chatId: number, messages: Message[]) => {
        set(state => ({
          messages: {
            ...state.messages,
            [chatId]: messages,
          },
        }));
      },

      addMessage: (chatId: number, message: Message, currentUserId?: number) => {
        // CRITICAL: Ensure chatId is always a number for consistent key access
        const numericChatId = Number(chatId);
        
        set(state => {
          const existingMessages = state.messages[numericChatId] || [];
          
          // Check if message already exists (avoid duplicates)
          const messageExists = existingMessages.some(m => m.id === message.id);
          if (messageExists) {
            return state;
          }
          
          // Determine if we should increment unread count:
          // 1. Not currently viewing this chat
          // 2. Message is NOT from the current user (don't count your own messages as unread)
          const currentChatIdNum = state.currentChatId !== null ? Number(state.currentChatId) : null;
          const senderId = message.sender?.id ? Number(message.sender.id) : null;
          const userId = currentUserId !== undefined ? Number(currentUserId) : null;
          const isOwnMessage = userId !== null && senderId !== null && senderId === userId;
          
          // User is viewing this chat if currentChatId matches
          const isViewingChat = currentChatIdNum !== null && currentChatIdNum === numericChatId;
          
          // Should NOT increment if: viewing this chat OR it's our own message
          const shouldIncrementUnread = !isViewingChat && !isOwnMessage;
          
          const currentUnreadCount = state.unreadCounts[numericChatId] || 0;
          const newUnreadCount = shouldIncrementUnread 
            ? currentUnreadCount + 1 
            : currentUnreadCount;
          
          // Update chat with new last message AND unread_count in all projects
          const newChatsByProject = { ...state.chatsByProject };
          Object.keys(newChatsByProject).forEach(projectIdStr => {
            const projectId = parseInt(projectIdStr);
            newChatsByProject[projectId] = newChatsByProject[projectId].map(chat =>
              Number(chat.id) === numericChatId 
                ? { ...chat, last_message: message, unread_count: newUnreadCount } 
                : chat
            );
          });
          
          // Create new unreadCounts object to ensure reference change for reactivity
          const newUnreadCounts = { ...state.unreadCounts };
          newUnreadCounts[numericChatId] = newUnreadCount;
          
          return {
            messages: {
              ...state.messages,
              [numericChatId]: [...existingMessages, message],
            },
            chatsByProject: newChatsByProject,
            unreadCounts: newUnreadCounts,
          };
        });
      },

      prependMessages: (chatId: number, messages: Message[]) => {
        set(state => {
          const existingMessages = state.messages[chatId] || [];
          
          // Filter out duplicates
          const newMessages = messages.filter(
            newMsg => !existingMessages.some(existing => existing.id === newMsg.id)
          );
          
          return {
            messages: {
              ...state.messages,
              [chatId]: [...newMessages, ...existingMessages],
            },
          };
        });
      },

      updateMessage: (messageId: number, updates: Partial<Message>) => {
        set(state => {
          const newMessages = { ...state.messages };
          
          // Find and update the message in the correct chat
          Object.keys(newMessages).forEach(chatIdStr => {
            const chatId = parseInt(chatIdStr);
            newMessages[chatId] = newMessages[chatId].map(msg =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            );
          });
          
          return { messages: newMessages };
        });
      },

      // ==================== Unread Count Actions ====================
      
      updateUnreadCount: (chatId: number, count: number) => {
        const safeCount = Math.max(0, count);
        
        // Single atomic state update
        set(state => {
          // Update chat unread_count in all projects
          const newChatsByProject = { ...state.chatsByProject };
          Object.keys(newChatsByProject).forEach(projectIdStr => {
            const projectId = parseInt(projectIdStr);
            newChatsByProject[projectId] = newChatsByProject[projectId].map(chat =>
              chat.id === chatId ? { ...chat, unread_count: safeCount } : chat
            );
          });
          
          return {
            unreadCounts: {
              ...state.unreadCounts,
              [chatId]: safeCount,
            },
            chatsByProject: newChatsByProject,
          };
        });
      },

      decrementUnreadCount: (chatId: number) => {
        const current = get().unreadCounts[chatId] || 0;
        get().updateUnreadCount(chatId, current - 1);
      },

      // ==================== UI State Actions ====================
      
      openWidget: () => {
        set({ isWidgetOpen: true });
      },

      closeWidget: () => {
        set({
          isWidgetOpen: false,
          widgetChatId: null,
          widgetView: 'list',
        });
      },

      // Widget-specific actions
      setWidgetChat: (chatId: number | null) => {
        set({
          widgetChatId: chatId,
          widgetView: chatId !== null ? 'chat' : 'list',
        });
      },

      setWidgetProjectId: (projectId: number | null) => {
        set({ widgetProjectId: projectId });
      },

      setWidgetView: (view: 'list' | 'chat') => {
        set({ widgetView: view });
      },

      setMessagePageOpen: (isOpen: boolean) => {
        set({ 
          isMessagePageOpen: isOpen,
          // Close widget when message page opens
          isWidgetOpen: isOpen ? false : get().isWidgetOpen,
        });
      },

      setSelectedProjectId: (projectId: number | null) => {
        set({ selectedProjectId: projectId });
      },

      setView: (view: 'list' | 'chat') => {
        set({ currentView: view });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // ==================== Helper Methods ====================
      
      getCurrentChat: () => {
        const { chatsByProject, currentChatId, selectedProjectId } = get();
        if (!currentChatId || !selectedProjectId) return undefined;
        const chats = chatsByProject[selectedProjectId] || [];
        return chats.find(chat => chat.id === currentChatId);
      },

      getCurrentMessages: () => {
        const { messages, currentChatId } = get();
        if (!currentChatId) return [];
        return messages[currentChatId] || [];
      },

      getTotalUnreadCount: () => {
        const { unreadCounts } = get();
        return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
      },

      // Fetch global unread count from backend (across ALL projects)
      fetchGlobalUnreadCount: async () => {
        try {
          const count = await getUnreadCount(); // No chatId = global count
          set({ globalUnreadCount: count });
          return count;
        } catch (error) {
          console.error('Error fetching global unread count:', error);
          return 0;
        }
      },

      // Update global unread count (called when messages are read)
      setGlobalUnreadCount: (count: number) => {
        set({ globalUnreadCount: Math.max(0, count) });
      },

      // Increment global unread count (called when new message received)
      incrementGlobalUnreadCount: () => {
        set(state => ({ globalUnreadCount: state.globalUnreadCount + 1 }));
      },

      // Decrement global unread count (called when message is read)
      decrementGlobalUnreadCount: (amount: number = 1) => {
        set(state => ({ globalUnreadCount: Math.max(0, state.globalUnreadCount - amount) }));
      },
    }),
    {
      name: 'chat-storage',
      // Only persist specific fields
      partialize: (state) => ({
        isWidgetOpen: state.isWidgetOpen,
        // Don't persist chats/messages as they should be fetched fresh
      }),
    }
  )
);
