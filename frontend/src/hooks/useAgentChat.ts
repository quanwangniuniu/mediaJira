import { useState, useCallback, useRef } from 'react';
import { AgentAPI } from '@/lib/api/agentApi';
import {
  AgentMessage,
  AgentChatRequest,
  SSEEvent,
  AgentMessageData,
} from '@/types/agent';

interface UseAgentChatReturn {
  messages: AgentMessage[];
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  sendMessage: (sessionId: number, request: AgentChatRequest) => void;
  cancelStream: () => void;
  setMessages: (msgs: AgentMessage[]) => void;
  clearError: () => void;
}

export function useAgentChat(): UseAgentChatReturn {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const cancelStream = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setIsStreaming(false);
    setStreamingContent('');
  }, []);

  const sendMessage = useCallback(
    (sessionId: number, request: AgentChatRequest) => {
      // Add user message immediately
      const userMsg: AgentMessage = {
        id: String(Date.now()),
        session_id: sessionId,
        role: 'user',
        content: request.message,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      setIsStreaming(true);
      setStreamingContent('');
      setError(null);

      let accumulatedContent = '';
      let accumulatedData: AgentMessageData = {};

      const controller = AgentAPI.sendMessage(
        sessionId,
        request,
        // onEvent
        (event: SSEEvent) => {
          switch (event.type) {
            case 'text':
              accumulatedContent += event.content || '';
              setStreamingContent(accumulatedContent);
              break;
            case 'analysis':
              accumulatedContent += event.content || '';
              setStreamingContent(accumulatedContent);
              if (event.data?.anomalies) {
                accumulatedData.anomalies = event.data.anomalies;
              }
              break;
            case 'decision_draft':
              accumulatedContent += event.content || '';
              setStreamingContent(accumulatedContent);
              if (event.data?.decision_id) {
                accumulatedData.decision_id = event.data.decision_id;
              }
              break;
            case 'task_created':
              accumulatedContent += event.content || '';
              setStreamingContent(accumulatedContent);
              if (event.data?.task_ids) {
                accumulatedData.task_ids = event.data.task_ids;
              }
              break;
            case 'error':
              setError(event.content || 'Unknown error from agent');
              break;
          }
        },
        // onError
        (err: Error) => {
          setError(err.message);
          setIsStreaming(false);
          setStreamingContent('');
        },
        // onDone
        () => {
          // Finalize: add assistant message with full content
          const assistantMsg: AgentMessage = {
            id: String(Date.now() + 1),
            session_id: sessionId,
            role: 'assistant',
            content: accumulatedContent,
            created_at: new Date().toISOString(),
            data: Object.keys(accumulatedData).length > 0
              ? accumulatedData
              : null,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setIsStreaming(false);
          setStreamingContent('');
        }
      );

      controllerRef.current = controller;
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    messages,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    cancelStream,
    setMessages,
    clearError,
  };
}
