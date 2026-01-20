'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { buildWsUrl } from '@/lib/ws';
import { useAuthStore } from '@/lib/authStore';
import { useChatStore } from '@/lib/chatStore';
import type { WebSocketMessage, Message } from '@/types/chat';

interface UseChatSocketOptions {
  onMessage?: (message: Message) => void;
  onStatusUpdate?: (messageId: number, status: string) => void;
  onError?: (error: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

// Global connection state to prevent multiple simultaneous connections
// This is important because ChatWidget and MessagePageContent can both try to connect
let globalConnectionPromise: Promise<void> | null = null;
let globalClosePromise: Promise<void> | null = null;

export function useChatSocket(userId: number | null | undefined, options: UseChatSocketOptions = {}) {
  const token = useAuthStore(state => state.token);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const retryRef = useRef(0);
  const shouldRun = !!userId;
  
  // Store callbacks in refs to avoid stale closure issues
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Send message through WebSocket
  const sendMessage = useCallback((chatId: number, content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message');
      return false;
    }

    try {
      const payload: WebSocketMessage = {
        type: 'send_message',
        chat_id: chatId,
        content: content,
      };
      
      wsRef.current.send(JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, []);

  // Mark message as delivered
  const markDelivered = useCallback((messageId: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const payload: WebSocketMessage = {
        type: 'message_status_update',
        message_id: messageId,
        status: 'delivered',
      };
      
      wsRef.current.send(JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error('Error marking delivered:', error);
      return false;
    }
  }, []);

  // Mark message as read
  const markRead = useCallback((messageId: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const payload: WebSocketMessage = {
        type: 'message_status_update',
        message_id: messageId,
        status: 'read',
      };
      
      wsRef.current.send(JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error('Error marking read:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    // Early return if we shouldn't run
    if (!shouldRun) {
      console.log('[Chat WebSocket] Not running - no userId');
      setConnected(false);
      setConnecting(false);
      return;
    }

    let stopped = false;
    let heartbeatInterval: NodeJS.Timeout | null = null;
    let connectTimeout: NodeJS.Timeout | null = null;

    const connect = async () => {
      if (stopped) return;
      
      // Wait for any pending close operations to complete
      if (globalClosePromise) {
        console.log('[Chat WebSocket] Waiting for previous connection to close...');
        try {
          await globalClosePromise;
        } catch {
          // Ignore close errors
        }
        // Small delay to ensure server has cleaned up the connection
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (stopped) return;
      
      // Wait for any pending connection to complete
      if (globalConnectionPromise) {
        console.log('[Chat WebSocket] Another connection in progress, waiting...');
        try {
          await globalConnectionPromise;
        } catch {
          // Ignore connection errors, we'll retry
        }
      }
      
      if (stopped) return;
      
      setConnecting(true);
      
      // Build WebSocket URL: /ws/chat/{userId}/
      const url = buildWsUrl(`/ws/chat/${userId}/`, token ? { token } : undefined);
      console.log('[Chat WebSocket] Connecting to:', url);

      // Create connection promise
      globalConnectionPromise = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Chat WebSocket] Connected');
        setConnected(true);
        setConnecting(false);
        retryRef.current = 0;
          globalConnectionPromise = null;
          optionsRef.current.onOpen?.();
          resolve();
        
        // Start heartbeat to keep connection alive and refresh online status
        heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            console.log('[Chat WebSocket] Sending heartbeat');
            ws.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }, 30000); // Send heartbeat every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('[Chat WebSocket] Message received:', data);

          // Get fresh store actions and state
          const { addMessage, updateMessage, chats } = useChatStore.getState();

          switch (data.type) {
            case 'new_message':
            case 'chat_message': // Backend sends 'chat_message', support both
              if (data.message) {
                // Handle both 'chat_id' and 'chat' fields (backend may send either)
                // IMPORTANT: Convert to number to ensure type consistency with store
                const rawChatId = data.message.chat_id || data.message.chat;
                const chatId = typeof rawChatId === 'string' ? parseInt(rawChatId, 10) : rawChatId;
                
                if (!chatId || isNaN(chatId)) {
                  console.error('[Chat WebSocket] Invalid chat_id in message:', data.message);
                  break;
                }
                
                // Get current state to check if user is viewing this chat
                const currentState = useChatStore.getState();
                const isCurrentlyViewing = currentState.currentChatId === chatId;
                
                console.log('[Chat WebSocket] Processing message:', {
                  chatId: chatId,
                  chatIdType: typeof chatId,
                  currentChatId: currentState.currentChatId,
                  currentChatIdType: typeof currentState.currentChatId,
                  isCurrentlyViewing: isCurrentlyViewing,
                  isMessagePageOpen: currentState.isMessagePageOpen,
                });
                
                // Normalize the message to ensure it has chat_id as number
                const normalizedMessage = {
                  ...data.message,
                  chat_id: chatId,
                };
                
                console.log('[Chat WebSocket] Adding message to store:', {
                  chatId: chatId,
                  messageId: normalizedMessage.id,
                  content: normalizedMessage.content,
                  sender: normalizedMessage.sender?.username,
                  currentUserId: userId,
                  chatExistsInStore: chats.some(c => c.id === chatId)
                });
                
                // Add to store with current user ID to properly handle unread count
                // (don't count your own messages as unread)
                addMessage(chatId, normalizedMessage, userId || undefined);
                
                // Log the updated state
                const updatedState = useChatStore.getState();
                const updatedChat = updatedState.chats.find(c => c.id === chatId);
                console.log('[Chat WebSocket] Message added, current store state:', {
                  allChatIds: Object.keys(updatedState.messages),
                  messagesCount: updatedState.messages[chatId]?.length || 0,
                  unreadCount: updatedState.unreadCounts[chatId] || 0,
                  chatLastMessage: updatedChat?.last_message?.content,
                  chatUnreadCount: updatedChat?.unread_count
                });
                
                  // Call callback using ref to get latest
                  optionsRef.current.onMessage?.(normalizedMessage);
              }
              break;

            case 'message_status_update':
              if (data.message_id && data.status) {
                // Update message status in store
                updateMessage(data.message_id, {
                  statuses: data.message?.statuses,
                });
                  // Call callback using ref to get latest
                  optionsRef.current.onStatusUpdate?.(data.message_id, data.status);
                }
                break;

              case 'chat_created':
                // New chat was created and we're a participant
                if (data.chat) {
                  console.log('[Chat WebSocket] New chat created:', data.chat);
                  const { addChat } = useChatStore.getState();
                  addChat(data.chat);
              }
              break;

              case 'pong':
                // Heartbeat response from server, ignore
                console.log('[Chat WebSocket] Pong received');
                break;

            case 'error':
              console.error('[Chat WebSocket] Server error:', data.error);
                optionsRef.current.onError?.(data.error || 'Unknown error');
              break;

            default:
              console.warn('[Chat WebSocket] Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('[Chat WebSocket] Parse error:', error);
        }
      };

      ws.onerror = (event) => {
        console.error('[Chat WebSocket] Error:', event);
        setConnected(false);
        setConnecting(false);
          globalConnectionPromise = null;
          reject(new Error('WebSocket connection failed'));
      };

      ws.onclose = (event) => {
        console.warn('[Chat WebSocket] Disconnected:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        
        // Clear heartbeat
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        
        setConnected(false);
        setConnecting(false);
        wsRef.current = null;
          globalConnectionPromise = null;
          optionsRef.current.onClose?.();

          // Reconnect with exponential backoff (only if not stopped)
        if (!stopped) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryRef.current), 10000);
          retryRef.current++;
          
          console.log(`[Chat WebSocket] Reconnecting in ${retryDelay}ms...`);
            connectTimeout = setTimeout(connect, retryDelay);
        }
      };
      });
      
      try {
        await globalConnectionPromise;
      } catch {
        // Connection failed, will be retried in onclose handler
      }
    };

    // Start connection with a small delay to allow any cleanup to complete
    const initialDelay = setTimeout(() => {
    connect();
    }, 50);

    return () => {
      stopped = true;
      clearTimeout(initialDelay);
      
      // Clear any pending reconnect timeout
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
      
      // Clear heartbeat
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      
      // Close socket and track the close promise
      if (wsRef.current) {
        console.log('[Chat WebSocket] Closing connection');
        const ws = wsRef.current;
        
        globalClosePromise = new Promise<void>((resolve) => {
          // Set up close handler
          const originalOnClose = ws.onclose;
          ws.onclose = (event) => {
            if (originalOnClose) {
              originalOnClose.call(ws, event);
            }
            globalClosePromise = null;
            resolve();
          };
          
          try {
            ws.close(1000, 'Component unmounted');
        } catch (error) {
          console.error('Error closing WebSocket:', error);
            globalClosePromise = null;
            resolve();
          }
          
          // Safety timeout - resolve after 500ms if close event doesn't fire
          setTimeout(() => {
            globalClosePromise = null;
            resolve();
          }, 500);
        });
        
        wsRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRun, userId, token]);

  return {
    connected,
    connecting,
    sendMessage,
    markDelivered,
    markRead,
  };
}
