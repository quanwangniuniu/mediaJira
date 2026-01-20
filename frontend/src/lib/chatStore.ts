// Chat state management with Zustand
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatState, Chat, Message } from '@/types/chat';

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // ==================== Initial State ====================
      chats: [],
      currentChatId: null,
      messages: {},
      unreadCounts: {},
      isWidgetOpen: false,
      isMessagePageOpen: false,
      selectedProjectId: null,
      currentView: 'list',
      isLoading: false,

      // ==================== Chat Actions ====================
      
      setChats: (chats: Chat[]) => {
        // Use set() with callback to get CURRENT state at the moment of update
        // This prevents race conditions where state changes between read and write
        set(state => {
          const currentUnreadCounts = state.unreadCounts;
          const currentChatId = state.currentChatId;
          
          // Build new unread counts, but preserve local values in certain cases:
          // 1. If user is currently viewing a chat (currentChatId), keep its unread as 0
          // 2. If local unread is 0 but backend says non-zero, the user likely just read it
          //    (keep 0 to avoid "unread" reappearing after viewing)
          const newUnreadCounts: Record<number, number> = {};
          chats.forEach(chat => {
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
          const updatedChats = chats.map(chat => ({
            ...chat,
            unread_count: newUnreadCounts[chat.id] ?? chat.unread_count ?? 0,
          }));
          
          return { chats: updatedChats, unreadCounts: newUnreadCounts };
        });
      },

      addChat: (chat: Chat) => {
        set(state => ({
          chats: [chat, ...state.chats],
          unreadCounts: {
            ...state.unreadCounts,
            [chat.id]: chat.unread_count || 0,
          },
        }));
      },

      updateChat: (chatId: number, updates: Partial<Chat>) => {
        set(state => ({
          chats: state.chats.map(chat =>
            chat.id === chatId ? { ...chat, ...updates } : chat
          ),
        }));
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
            
            // Also update the chat object's unread_count for consistency
            updates.chats = state.chats.map(chat =>
              Number(chat.id) === numericChatId ? { ...chat, unread_count: 0 } : chat
            );
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
          
          // Update chat with new last message AND unread_count
          const updatedChats = state.chats.map(chat =>
            Number(chat.id) === numericChatId 
              ? { ...chat, last_message: message, unread_count: newUnreadCount } 
              : chat
          );
          
          // Create new unreadCounts object to ensure reference change for reactivity
          const newUnreadCounts = { ...state.unreadCounts };
          newUnreadCounts[numericChatId] = newUnreadCount;
          
          return {
            messages: {
              ...state.messages,
              [numericChatId]: [...existingMessages, message],
            },
            chats: updatedChats,
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
        set(state => ({
          unreadCounts: {
            ...state.unreadCounts,
            [chatId]: safeCount,
          },
          chats: state.chats.map(chat =>
            chat.id === chatId ? { ...chat, unread_count: safeCount } : chat
          ),
        }));
      },

      decrementUnreadCount: (chatId: number) => {
        const current = get().unreadCounts[chatId] || 0;
        get().updateUnreadCount(chatId, current - 1);
      },

      // ==================== UI State Actions ====================
      
      openWidget: () => {
        // Don't open widget if message page is open
        const { isMessagePageOpen } = get();
        if (!isMessagePageOpen) {
          set({ isWidgetOpen: true });
        }
      },

      closeWidget: () => {
        set({
          isWidgetOpen: false,
          currentChatId: null,
          currentView: 'list',
        });
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
        const { chats, currentChatId } = get();
        if (!currentChatId) return undefined;
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

