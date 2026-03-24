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

type CalendarPreload = { message: string; context: Record<string, unknown> }

// Module-level flag — persists across React StrictMode's unmount+remount cycles.
// Reset to false each time new calendar context is loaded so the auto-send fires once per navigation.
let _calendarAutoSendFired = false

function buildCalendarPreload(): CalendarPreload | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem("agent-calendar-context")
  if (!raw) return null
  sessionStorage.removeItem("agent-calendar-context")
  _calendarAutoSendFired = false  // new context arrived — allow one send
  try {
    const ctx = JSON.parse(raw)
    let message: string
    if (ctx.type === "event") {
      const start = new Date(ctx.startDatetime)
      const end = new Date(ctx.endDatetime)
      const dateStr = start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      const startTime = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const endTime = end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      message = `I'm looking at a calendar event: "${ctx.eventTitle}" on ${dateStr} from ${startTime} to ${endTime}.${ctx.description ? ` Description: ${ctx.description}.` : ""} Can you help me understand this event and suggest what I should prepare or do?`
    } else {
      message = `I'm viewing my calendar (${ctx.currentView ?? "week"} view). Can you help me understand my calendar events, check my availability, or assist with scheduling?`
    }
    return { message, context: ctx }
  } catch {
    return null
  }
}

export function AgentChatPage() {
  const { setActiveView, floatingChat, toggleMaximize, setPendingDecisionId } = useAgentLayout()
  const [sessionId, setSessionIdState] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const [pendingCalendarPreload] = useState<CalendarPreload | null>(buildCalendarPreload)
  // Persist calendar context for the lifetime of this session so follow-up messages
  // also go through the calendar workflow, not the generic fallback.
  const [sessionCalendarContext, setSessionCalendarContext] = useState<Record<string, unknown> | null>(
    pendingCalendarPreload ? pendingCalendarPreload.context : null
  )
  // Persist calendar context so it survives page refreshes / session restores
  useEffect(() => {
    if (sessionCalendarContext) {
      sessionStorage.setItem("agent-session-calendar-context", JSON.stringify(sessionCalendarContext))
    }
  }, [sessionCalendarContext])

  const handleSendMessageRef = useRef<typeof handleSendMessage | null>(null)
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
          // Restore calendar context for this session if available
          const storedCtx = sessionStorage.getItem("agent-session-calendar-context")
          if (storedCtx) {
            try { setSessionCalendarContext(JSON.parse(storedCtx)) } catch {}
          }
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
      sessionStorage.removeItem("agent-session-calendar-context")
      setMessages([])
      setSessionCalendarContext(null)
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
  const handleSendMessage = useCallback(async (text: string, calendarContext?: Record<string, unknown>) => {
    setHasStarted(true)
    // Use provided context or fall back to the session-level calendar context
    const effectiveCalendarContext = calendarContext ?? sessionCalendarContext ?? undefined
    if (calendarContext && !sessionCalendarContext) {
      setSessionCalendarContext(calendarContext)
    }

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
      { message: text, ...(effectiveCalendarContext ? { calendar_context: effectiveCalendarContext as any } : {}) },
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
  }, [sessionId, sessionCalendarContext, addMessage, updateMessage])

  // Keep ref always pointing to the latest handleSendMessage
  handleSendMessageRef.current = handleSendMessage

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

  // Auto-send calendar context message when arriving from calendar/event page (once only).
  // Uses a module-level flag + ref to handleSendMessage so this effect only fires on mount
  // and when hasStarted changes — NOT when sessionId changes and recreates handleSendMessage.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pendingCalendarPreload || hasStarted) return
    if (_calendarAutoSendFired) return
    _calendarAutoSendFired = true
    handleSendMessageRef.current?.(pendingCalendarPreload.message, pendingCalendarPreload.context)
  }, [pendingCalendarPreload, hasStarted])

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
