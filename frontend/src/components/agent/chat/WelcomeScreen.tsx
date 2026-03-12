"use client"

import { BarChart3, Search, DollarSign } from "lucide-react"
import { ChatInput } from "./ChatInput"

const TEMPLATES = [
  { label: "Analyze Report", icon: BarChart3, message: "Analyze this report for key insights" },
  { label: "Find Anomalies", icon: Search, message: "Find anomalies in my campaign data" },
  { label: "Budget Review", icon: DollarSign, message: "Review budget allocation and ROAS" },
]

interface WelcomeScreenProps {
  onSend: (message: string) => void
  onFileUpload: (file: File) => void
  disabled?: boolean
}

export function WelcomeScreen({ onSend, onFileUpload, disabled }: WelcomeScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            What do you want to analyze today?
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload a CSV or Excel file, or ask a question to get started.
          </p>
        </div>

        {/* Input */}
        <ChatInput
          onSend={onSend}
          onFileUpload={onFileUpload}
          disabled={disabled}
          placeholder="Upload a file or type your question..."
        />

        {/* Quick templates */}
        <div className="flex flex-wrap justify-center gap-3">
          {TEMPLATES.map((tpl) => {
            const Icon = tpl.icon
            return (
              <button
                key={tpl.label}
                onClick={() => onSend(tpl.message)}
                disabled={disabled}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                {tpl.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
