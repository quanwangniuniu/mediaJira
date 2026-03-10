"use client"

import { useState, useCallback, useRef } from "react"
import { useAgentLayout } from "@/components/agent/AgentLayoutContext"
import { StepProgress } from "./StepProgress"
import { ImportStep } from "./ImportStep"
import { StepContent } from "./StepContent"
import { ChatPanel, type ChatMessage } from "./ChatPanel"
import { AgentAPI } from "@/lib/api/agentApi"
import type { SSEEvent, AgentAction } from "@/types/agent"
import { AGENT_MESSAGES } from "@/lib/agentMessages"

const STEPS = [
  { id: 1, label: "Import" },
  { id: 2, label: "Analyze" },
  { id: 3, label: "Decide" },
  { id: 4, label: "Execute" },
]

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    content: AGENT_MESSAGES.CHAT_WELCOME,
  },
]

export function AgentPipeline() {
  const { setActiveView } = useAgentLayout()
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Analysis results from SSE for child components
  const [analysisData, setAnalysisData] = useState<Record<string, unknown> | null>(null)
  const [decisionData, setDecisionData] = useState<Record<string, unknown> | null>(null)
  const [taskData, setTaskData] = useState<Record<string, unknown> | null>(null)

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCompletedSteps((prev) => [...prev, currentStep])
      setCurrentStep((prev) => prev + 1)
    }
  }

  /** Send a chat message with optional action params, returns when SSE completes */
  const sendChatMessage = useCallback(async (
    message: string,
    extra?: { action?: AgentAction; csv_filename?: string; spreadsheet_id?: number }
  ) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
    }
    setMessages((prev) => [...prev, userMsg])

    // Create session if needed
    let sid = sessionId
    if (!sid) {
      try {
        const session = await AgentAPI.createSession({})
        sid = String(session.id)
        setSessionId(sid)
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: "assistant", content: AGENT_MESSAGES.SESSION_CREATE_FAILED },
        ])
        return
      }
    }

    setIsStreaming(true)
    let assistantContent = ""
    const assistantMsgId = `ai-${Date.now()}`

    // Add placeholder assistant message
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: "assistant", content: AGENT_MESSAGES.CHAT_THINKING },
    ])

    return new Promise<void>((resolve) => {
      abortRef.current = AgentAPI.sendMessage(
        sid!,
        { message, ...extra },
        (event: SSEEvent) => {
          if (event.type === "done") return

          if (event.content) {
            assistantContent += (assistantContent ? "\n" : "") + event.content
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, content: assistantContent } : m
              )
            )
          }

          // Track analysis/decision/task data from SSE
          if (event.type === "analysis" && event.data) {
            setAnalysisData(event.data as Record<string, unknown>)
          }
          if (event.type === "decision_draft" && event.data) {
            setDecisionData(event.data as Record<string, unknown>)
          }
          if (event.type === "task_created" && event.data) {
            setTaskData(event.data as Record<string, unknown>)
          }
        },
        (error) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: `Error: ${error.message}` } : m
            )
          )
          setIsStreaming(false)
          resolve()
        },
        () => {
          setIsStreaming(false)
          resolve()
        }
      )
    })
  }, [sessionId])

  /** Handle Import step: upload CSV only */
  const handleImportNext = useCallback(async () => {
    if (!selectedFile) return

    setIsUploading(true)

    try {
      const result = await AgentAPI.uploadCSV(selectedFile)
      setMessages((prev) => [
        ...prev,
        {
          id: `upload-${Date.now()}`,
          role: "assistant",
          content: `Uploaded "${result.filename}" (${result.row_count} rows). Ready for analysis.`,
        },
      ])
      setCompletedSteps((prev) => [...prev, 1])
      setCurrentStep(2)
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `Failed to upload file: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      ])
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile])

  /** Handle free-form chat messages from the ChatPanel */
  const handleSendMessage = useCallback(async (message: string) => {
    await sendChatMessage(message)
  }, [sendChatMessage])

  const suggestedActions = currentStep === 1
    ? ["Analyze this data", "What anomalies do you see?"]
    : currentStep === 2
    ? ["Create a decision draft", "Show top performers"]
    : currentStep === 3
    ? ["Create tasks from this decision", "Modify the decision"]
    : ["Execute all tasks", "Review task details"]

  return (
    <div className="flex h-full flex-col">
      {/* Step Progress */}
      <div className="border-b border-border bg-card/30 px-6 py-6">
        <StepProgress
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
        />
      </div>

      {/* Main Content + Chat */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Step Content (~70%) */}
        <div className="flex-[7] overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-2xl">
            {currentStep === 1 && (
              <ImportStep
                selectedFile={selectedFile}
                onFileSelect={setSelectedFile}
                onNext={handleImportNext}
                isUploading={isUploading}
              />
            )}
            {currentStep >= 2 && (
              <StepContent
                step={currentStep}
                onNext={handleNext}
                setActiveView={setActiveView}
                analysisData={analysisData}
                decisionData={decisionData}
                taskData={taskData}
              />
            )}
          </div>
        </div>

        {/* Chat Panel (~30%) */}
        <div className="flex-[3] min-h-[280px]">
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            suggestedActions={suggestedActions}
          />
        </div>
      </div>
    </div>
  )
}
