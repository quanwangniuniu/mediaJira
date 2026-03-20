"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useAgentLayout, type AgentView } from "@/components/agent/AgentLayoutContext"
import { WelcomeScreen } from "./WelcomeScreen"
import { MessageList, type ChatMessage } from "./MessageList"
import { ChatInput } from "./ChatInput"
import { AgentAPI } from "@/lib/api/agentApi"
import type { SSEEvent, AgentAction, AgentMessage, AnalysisResult } from "@/types/agent"
import { AGENT_MESSAGES } from "@/lib/agentMessages"

/** Broadcast anomalies from restored messages to RightPanel Alerts. */
function broadcastRestoredAnomalies(messages: AgentMessage[]) {
  // Find the last message with anomalies and broadcast it
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].data?.anomalies) {
      window.dispatchEvent(new CustomEvent("agent:analysis-complete", {
        detail: { anomalies: messages[i].data!.anomalies }
      }))
      break
    }
  }
}

/** Restore a persisted AgentMessage into a ChatMessage with correct type & navigation. */
function restoreMessage(m: AgentMessage): ChatMessage {
  let type: ChatMessage["type"] = "text"
  let navigateTo: string | undefined
  let navigateLabel: string | undefined
  const isFollowUpPrompt = m.message_type === "confirmation_request"

  if (m.data?.anomalies) {
    type = "analysis"
  } else if (m.message_type === "decision_draft" || m.data?.decision_id) {
    type = "decision_created"
    navigateTo = "decisions"
    navigateLabel = "Go to Decisions"
  } else if (m.message_type === "task_created" || m.data?.task_ids) {
    type = "tasks_created"
    navigateTo = "tasks"
    navigateLabel = "Go to Tasks"
  }

  return {
    id: String(m.id),
    role: m.role,
    content: m.content,
    type,
    isFollowUpPrompt,
    anomalies: m.data?.anomalies,
    suggestedDecision: m.data?.suggested_decision,
    recommendedTasks: m.data?.recommended_tasks,
    navigateTo,
    navigateLabel,
    decisionId: m.data?.decision_id ? Number(m.data.decision_id) : undefined,
  }
}

export function AgentChatPage() {
  const { setActiveView, floatingChat, toggleMaximize, setPendingDecisionId } = useAgentLayout()
  const [sessionId, setSessionIdState] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const latestMessage = messages[messages.length - 1]
  const isAwaitingFollowUp = Boolean(
    latestMessage &&
    latestMessage.role === "assistant" &&
    latestMessage.isFollowUpPrompt &&
    !isStreaming
  )
  const inputPlaceholder = isAwaitingFollowUp
    ? "Ask one follow-up question about the analysis, or include an exact username/email for forwarding..."
    : "Ask about your data or upload a file..."
  const inputHelperText = isAwaitingFollowUp
    ? "You can send one follow-up message now. Ask for an explanation, a short report, or forwarding to specific project members."
    : undefined

  // Abort SSE on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const setSessionId = useCallback((id: string | null) => {
    setSessionIdState(id)
    if (id) {
      sessionStorage.setItem("agent-session-id", id)
    } else {
      sessionStorage.removeItem("agent-session-id")
    }
  }, [])

  // Restore session on mount
  useEffect(() => {
    const storedId = sessionStorage.getItem("agent-session-id")
    if (storedId) {
      AgentAPI.getSession(storedId)
        .then((session) => {
          setSessionIdState(String(session.id))
          setHasStarted(true)
          setMessages(session.messages.map(restoreMessage))
          broadcastRestoredAnomalies(session.messages)
        })
        .catch(() => {
          sessionStorage.removeItem("agent-session-id")
        })
    }
  }, [])

  // Listen for sidebar events
  useEffect(() => {
    const handleNewChat = () => {
      setSessionIdState(null)
      sessionStorage.removeItem("agent-session-id")
      setMessages([])
      setHasStarted(false)
      setIsStreaming(false)
      abortRef.current?.abort()
    }

    const handleLoadSession = async (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail?.sessionId) return

      try {
        const session = await AgentAPI.getSession(detail.sessionId)
        setSessionId(String(session.id))
        setHasStarted(true)
        setMessages(session.messages.map(restoreMessage))
        broadcastRestoredAnomalies(session.messages)
      } catch {
        // Session not found — stay on welcome
      }
    }

    window.addEventListener("agent:new-chat", handleNewChat)
    window.addEventListener("agent:load-session", handleLoadSession)
    return () => {
      window.removeEventListener("agent:new-chat", handleNewChat)
      window.removeEventListener("agent:load-session", handleLoadSession)
    }
  }, [])

  /** Append a new message and return its id */
  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg])
    return msg.id
  }, [])

  /** Update an existing message by id */
  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    )
  }, [])

  /** Handle file upload — calls upload-analyze SSE endpoint */
  const handleFileUpload = useCallback(async (file: File) => {
    setHasStarted(true)

    // Show user message
    const userMsgId = `user-${Date.now()}`
    addMessage({
      id: userMsgId,
      role: "user",
      content: `Uploaded ${file.name}`,
      type: "file_uploaded",
      fileName: file.name,
    })

    // Show thinking placeholder
    const aiMsgId = `ai-${Date.now()}`
    addMessage({
      id: aiMsgId,
      role: "assistant",
      content: AGENT_MESSAGES.CHAT_THINKING,
      type: "text",
    })

    setIsStreaming(true)

    let contentParts: string[] = []
    let analysisData: AnalysisResult | null = null

    abortRef.current = AgentAPI.uploadAndAnalyze(
      file,
      sessionId,
      (event: SSEEvent) => {
        if (event.type === "file_uploaded") {
          // File confirmed uploaded — update thinking message
          updateMessage(aiMsgId, {
            content: event.content || "File uploaded. Analyzing...",
          })
        } else if (event.type === "text") {
          contentParts.push(event.content || "")
          updateMessage(aiMsgId, { content: contentParts.join("\n") })
        } else if (event.type === "analysis") {
          contentParts.push(event.content || "")
          analysisData = (event.data as unknown as AnalysisResult) || null
          updateMessage(aiMsgId, {
            content: contentParts.join("\n"),
            type: "analysis",
            anomalies: analysisData?.anomalies,
            suggestedDecision: analysisData?.suggested_decision,
            recommendedTasks: analysisData?.recommended_tasks,
          })
          // Broadcast to RightPanel Alerts
          if (analysisData?.anomalies) {
            window.dispatchEvent(new CustomEvent("agent:analysis-complete", {
              detail: { anomalies: analysisData.anomalies }
            }))
          }
        } else if (event.type === "confirmation_request") {
          contentParts.push(event.content || "")
          updateMessage(aiMsgId, {
            content: contentParts.join("\n"),
            isFollowUpPrompt: true,
          })
        } else if (event.type === "error") {
          updateMessage(aiMsgId, { content: event.content || "An error occurred.", type: "error" })
        } else if (event.type === "done") {
          // Capture session_id from done event
          const sid = event.data?.session_id
          if (sid) {
            setSessionId(sid)
            window.dispatchEvent(new CustomEvent("agent:sessions-changed"))
          }
        }
      },
      (error) => {
        updateMessage(aiMsgId, { content: `Error: ${error.message}`, type: "error" })
        setIsStreaming(false)
      },
      () => {
        setIsStreaming(false)
      }
    )
  }, [sessionId, addMessage, updateMessage])

  /** Handle text message send */
  const handleSendMessage = useCallback(async (text: string) => {
    setHasStarted(true)

    const userMsgId = `user-${Date.now()}`
    addMessage({ id: userMsgId, role: "user", content: text, type: "text" })

    // Create session if needed
    let sid = sessionId
    if (!sid) {
      try {
        const session = await AgentAPI.createSession({})
        sid = String(session.id)
        setSessionId(sid)
        window.dispatchEvent(new CustomEvent("agent:sessions-changed"))
      } catch {
        addMessage({
          id: `err-${Date.now()}`,
          role: "assistant",
          content: AGENT_MESSAGES.SESSION_CREATE_FAILED,
          type: "error",
        })
        return
      }
    }

    const aiMsgId = `ai-${Date.now()}`
    addMessage({ id: aiMsgId, role: "assistant", content: AGENT_MESSAGES.CHAT_THINKING, type: "text" })

    setIsStreaming(true)
    let contentParts: string[] = []

    abortRef.current = AgentAPI.sendMessage(
      sid!,
      { message: text },
      (event: SSEEvent) => {
        if (event.type === "done") return

        if (event.content) {
          contentParts.push(event.content)
          updateMessage(aiMsgId, { content: contentParts.join("\n") })
        }

        if (event.type === "analysis" && event.data) {
          const data = event.data as unknown as AnalysisResult
          updateMessage(aiMsgId, {
            type: "analysis",
            anomalies: data.anomalies,
            suggestedDecision: data.suggested_decision,
            recommendedTasks: data.recommended_tasks,
          })
          // Broadcast to RightPanel Alerts
          if (data.anomalies) {
            window.dispatchEvent(new CustomEvent("agent:analysis-complete", {
              detail: { anomalies: data.anomalies }
            }))
          }
        }
        if (event.type === "decision_draft" && event.data) {
          const decisionId = event.data?.decision_id
          updateMessage(aiMsgId, {
            content: contentParts.join("\n"),
            type: "decision_created",
            navigateTo: "decisions",
            navigateLabel: "Go to Decisions",
            decisionId: decisionId ? Number(decisionId) : undefined,
          })
        }
        if (event.type === "task_created" && event.data) {
          updateMessage(aiMsgId, {
            content: contentParts.join("\n"),
            type: "tasks_created",
            navigateTo: "tasks",
            navigateLabel: "Go to Tasks",
          })
        }
      },
      (error) => {
        updateMessage(aiMsgId, { content: `Error: ${error.message}`, type: "error" })
        setIsStreaming(false)
      },
      () => {
        setIsStreaming(false)
      }
    )
  }, [sessionId, addMessage, updateMessage])

  /** Handle action buttons (Create Decision, Create Tasks) */
  const handleAction = useCallback(async (action: string) => {
    if (!sessionId) return

    const actionMap: Record<string, AgentAction> = {
      confirm_decision: "confirm_decision",
      create_tasks: "create_tasks",
    }
    const agentAction = actionMap[action]
    if (!agentAction) return

    const aiMsgId = `ai-${Date.now()}`
    addMessage({ id: aiMsgId, role: "assistant", content: AGENT_MESSAGES.CHAT_THINKING, type: "text" })

    setIsStreaming(true)
    let contentParts: string[] = []

    abortRef.current = AgentAPI.sendMessage(
      sessionId,
      { message: action, action: agentAction },
      (event: SSEEvent) => {
        if (event.type === "done") return

        if (event.content) {
          contentParts.push(event.content)
          updateMessage(aiMsgId, { content: contentParts.join("\n") })
        }

        if (event.type === "decision_draft") {
          const decisionId = event.data?.decision_id
          updateMessage(aiMsgId, {
            content: contentParts.join("\n"),
            type: "decision_created",
            navigateTo: "decisions",
            navigateLabel: "Go to Decisions",
            decisionId: decisionId ? Number(decisionId) : undefined,
          })
        }
        if (event.type === "task_created") {
          updateMessage(aiMsgId, {
            content: contentParts.join("\n"),
            type: "tasks_created",
            navigateTo: "tasks",
            navigateLabel: "Go to Tasks",
          })
        }
      },
      (error) => {
        updateMessage(aiMsgId, { content: `Error: ${error.message}`, type: "error" })
        setIsStreaming(false)
      },
      () => {
        setIsStreaming(false)
      }
    )
  }, [sessionId, addMessage, updateMessage])

  if (!hasStarted) {
    return (
      <WelcomeScreen
        onSend={handleSendMessage}
        onFileUpload={handleFileUpload}
        disabled={isStreaming}
      />
    )
  }

  return (
    <div className="flex h-full flex-col">
      <MessageList messages={messages} onAction={handleAction} onNavigate={(view, msg) => {
        setActiveView(view as AgentView)
        if (floatingChat.mode === "maximized") toggleMaximize()
        if (view === "decisions" && msg?.decisionId) {
          setPendingDecisionId(msg.decisionId)
        }
      }} />
      <ChatInput
        onSend={handleSendMessage}
        onFileUpload={handleFileUpload}
        disabled={isStreaming}
        placeholder={inputPlaceholder}
        helperText={inputHelperText}
      />
    </div>
  )
}
