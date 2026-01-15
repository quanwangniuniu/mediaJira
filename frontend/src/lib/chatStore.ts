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
      currentView: 'list',
      isLoading: false,

      // ==================== Chat Actions ====================
      
      setChats: (chats: Chat[]) => {
        // Update unread counts from chat data
        const unreadCounts: Record<number, number> = {};
        chats.forEach(chat => {
          if (chat.unread_count !== undefined) {
            unreadCounts[chat.id] = chat.unread_count;
          }
        });
        
        // ✅ Single atomic state update
        set({ chats, unreadCounts });
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
        // ✅ Single atomic state update
        set(state => {
          const updates: Partial<ChatState> = {
            currentChatId: chatId,
            currentView: chatId ? 'chat' : 'list',
          };
          
          // Reset unread count for this chat
          if (chatId !== null) {
            updates.unreadCounts = {
              ...state.unreadCounts,
              [chatId]: 0,
            };
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
        console.log('📝 [chatStore] addMessage called:', { chatId, messageId: message.id, senderId: message.sender?.id, currentUserId });
        
        set(state => {
          const existingMessages = state.messages[chatId] || [];
          
          // Check if message already exists (avoid duplicates)
          const messageExists = existingMessages.some(m => m.id === message.id);
          if (messageExists) {
            console.log('⚠️ [chatStore] Message already exists, skipping');
            return state;
          }
          
          console.log('✅ [chatStore] Adding new message, previous count:', existingMessages.length);
          
          // Determine if we should increment unread count:
          // 1. Not currently viewing this chat
          // 2. Message is NOT from the current user (don't count your own messages as unread)
          const isOwnMessage = currentUserId !== undefined && message.sender?.id === currentUserId;
          const isViewingChat = state.currentChatId === chatId;
          const shouldIncrementUnread = !isViewingChat && !isOwnMessage;
          
          const currentUnreadCount = state.unreadCounts[chatId] || 0;
          const newUnreadCount = shouldIncrementUnread 
            ? currentUnreadCount + 1 
            : currentUnreadCount;
          
          console.log('📊 [chatStore] Unread count update:', { 
            isOwnMessage, 
            isViewingChat, 
            shouldIncrementUnread, 
            currentUnreadCount, 
            newUnreadCount 
          });
          
          // Update chat with new last message AND unread_count
          const updatedChats = state.chats.map(chat =>
            chat.id === chatId 
              ? { ...chat, last_message: message, unread_count: newUnreadCount } 
              : chat
          );
          
          // ✅ Single atomic state update - all changes in one set() call
          return {
            messages: {
              ...state.messages,
              [chatId]: [...existingMessages, message],
            },
            chats: updatedChats,
            unreadCounts: {
              ...state.unreadCounts,
              [chatId]: newUnreadCount,
            },
          };
        });
        
        console.log('✅ [chatStore] State updated, new count:', get().messages[chatId]?.length || 0);
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
        
        // ✅ Single atomic state update
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
        set({ isWidgetOpen: true });
      },

      closeWidget: () => {
        set({
          isWidgetOpen: false,
          currentChatId: null,
          currentView: 'list',
        });
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

