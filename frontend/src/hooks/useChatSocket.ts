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

export function useChatSocket(userId: number | null | undefined, options: UseChatSocketOptions = {}) {
  const token = useAuthStore(state => state.token);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const retryRef = useRef(0);
  const shouldRun = !!userId;

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
    if (!shouldRun) {
      setConnected(false);
      setConnecting(false);
      return;
    }

    let stopped = false;
    let heartbeatInterval: NodeJS.Timeout | null = null;

    const connect = () => {
      if (stopped) return;
      
      setConnecting(true);
      
      // Build WebSocket URL: /ws/chat/{userId}/
      const url = buildWsUrl(`/ws/chat/${userId}/`, token ? { token } : undefined);
      console.log('🔌 [Chat WebSocket] Connecting to:', url);

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ [Chat WebSocket] Connected');
        setConnected(true);
        setConnecting(false);
        retryRef.current = 0;
        options.onOpen?.();
        
        // Start heartbeat to keep connection alive and refresh online status
        heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            console.log('💓 [Chat WebSocket] Sending heartbeat');
            ws.send(JSON.stringify({ type: 'heartbeat' }));
          }
        }, 30000); // Send heartbeat every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          console.log('📩 [Chat WebSocket] Message received:', data);

          // Get fresh store actions and state
          const { addMessage, updateMessage, chats } = useChatStore.getState();

          switch (data.type) {
            case 'new_message':
            case 'chat_message': // Backend sends 'chat_message', support both
              if (data.message) {
                // Handle both 'chat_id' and 'chat' fields (backend may send either)
                const chatId = data.message.chat_id || data.message.chat;
                
                if (!chatId) {
                  console.error('❌ [Chat WebSocket] No chat_id in message:', data.message);
                  break;
                }
                
                // Normalize the message to ensure it has chat_id
                const normalizedMessage = {
                  ...data.message,
                  chat_id: chatId,
                };
                
                console.log('🔔 Adding message to store:', {
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
                console.log('✅ Message added, current store state:', {
                  allChatIds: Object.keys(updatedState.messages),
                  messagesCount: updatedState.messages[chatId]?.length || 0,
                  unreadCount: updatedState.unreadCounts[chatId] || 0,
                  chatLastMessage: updatedChat?.last_message?.content,
                  chatUnreadCount: updatedChat?.unread_count
                });
                
                // Call callback
                options.onMessage?.(normalizedMessage);
              }
              break;

            case 'message_status_update':
              if (data.message_id && data.status) {
                // Update message status in store
                updateMessage(data.message_id, {
                  statuses: data.message?.statuses,
                });
                // Call callback
                options.onStatusUpdate?.(data.message_id, data.status);
              }
              break;

            case 'error':
              console.error('❌ [Chat WebSocket] Server error:', data.error);
              options.onError?.(data.error || 'Unknown error');
              break;

            default:
              console.warn('⚠️ [Chat WebSocket] Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('❌ [Chat WebSocket] Parse error:', error);
        }
      };

      ws.onerror = (event) => {
        console.error('❌ [Chat WebSocket] Error:', event);
        setConnected(false);
        setConnecting(false);
      };

      ws.onclose = (event) => {
        console.warn('🔌 [Chat WebSocket] Disconnected:', {
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
        options.onClose?.();

        // Reconnect with exponential backoff
        if (!stopped) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryRef.current), 10000);
          retryRef.current++;
          
          console.log(`🔄 [Chat WebSocket] Reconnecting in ${retryDelay}ms...`);
          setTimeout(connect, retryDelay);
        }
      };
    };

    connect();

    return () => {
      stopped = true;
      
      // Clear heartbeat
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      
      if (wsRef.current) {
        console.log('🔌 [Chat WebSocket] Closing connection');
        try {
          wsRef.current.close();
        } catch (error) {
          console.error('Error closing WebSocket:', error);
        }
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

