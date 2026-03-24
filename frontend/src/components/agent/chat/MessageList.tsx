"use client"

import { useEffect, useRef } from "react"
import { Bot, User, FileSpreadsheet, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AGENT_MESSAGES } from "@/lib/agentMessages"
import { AnomalyCard } from "./AnomalyCard"
import { DecisionCard } from "./DecisionCard"
import { TaskListCard } from "./TaskListCard"
import type { AnomalyItem, SuggestedDecision, RecommendedTask } from "@/types/agent"
import { StepProgress, type StepProgressItem } from "./StepProgress"

export type ChatMessageType = "text" | "analysis" | "file_uploaded" | "decision_created" | "tasks_created" | "step_progress" | "error"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  type?: ChatMessageType
  isFollowUpPrompt?: boolean
  anomalies?: AnomalyItem[]
  suggestedDecision?: SuggestedDecision
  recommendedTasks?: RecommendedTask[]
  fileName?: string
  navigateTo?: string
  navigateLabel?: string
  decisionId?: number
  stepProgress?: StepProgressItem[]
}

interface MessageListProps {
  messages: ChatMessage[]
  onAction?: (action: string) => void
  onNavigate?: (view: string, message?: ChatMessage) => void
}

export function MessageList({ messages, onAction, onNavigate }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex gap-3",
            message.role === "user" && "flex-row-reverse"
          )}
        >
          {/* Avatar */}
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5",
              message.role === "assistant" ? "bg-primary/20" : "bg-muted"
            )}
          >
            {message.role === "assistant" ? (
              <Bot className="h-4 w-4 text-primary" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* Content */}
          <div className={cn("max-w-[80%] space-y-2", message.role === "user" && "items-end")}>
            {/* File uploaded indicator */}
            {message.type === "file_uploaded" && message.fileName && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-3 py-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">{message.fileName}</span>
              </div>
            )}

            {/* Text bubble */}
            {message.content && (
              <div
                className={cn(
                  "rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap",
                  message.role === "assistant"
                    ? "bg-muted text-foreground"
                    : "bg-primary text-primary-foreground",
                  message.role === "assistant" && message.content === AGENT_MESSAGES.CHAT_THINKING && "animate-pulse"
                )}
              >
                {message.content}
              </div>
            )}

            {/* Step progress */}
            {message.stepProgress && message.stepProgress.length > 0 && (
              <StepProgress steps={message.stepProgress} />
            )}

            {/* Navigation button */}
            {message.navigateTo && message.navigateLabel && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => onNavigate?.(message.navigateTo!, message)}
              >
                {message.navigateLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}

            {/* Analysis result cards */}
            {message.anomalies && message.anomalies.length > 0 && (
              <AnomalyCard anomalies={message.anomalies} />
            )}

            {message.suggestedDecision && (
              <DecisionCard
                decision={message.suggestedDecision}
                onCreateDecision={() => onAction?.("confirm_decision")}
                onDismiss={() => {}}
              />
            )}

            {message.recommendedTasks && message.recommendedTasks.length > 0 && (
              <TaskListCard
                tasks={message.recommendedTasks}
                onCreateAll={() => onAction?.("create_tasks")}
              />
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
