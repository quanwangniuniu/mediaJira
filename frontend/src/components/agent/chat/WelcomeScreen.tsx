"use client"

import { useState, useEffect, useRef } from "react"
import { Upload, BarChart3, Search, DollarSign, Workflow } from "lucide-react"
import { ChatInput } from "./ChatInput"
import { AgentAPI } from "@/lib/api/agentApi"
import type { AgentWorkflowDefinition } from "@/types/agent"

const ACCEPTED_TYPES = ".csv,.xlsx,.xls"

const TEMPLATES = [
  {
    label: "Analyze Report",
    description: "Get AI-driven insights on campaign performance",
    icon: BarChart3,
    message: "Analyze this report for key insights",
    workflowKeyword: "analysis",
  },
  {
    label: "Find Anomalies",
    description: "Detect unusual patterns and outliers in your data",
    icon: Search,
    message: "Find anomalies in my campaign data",
    workflowKeyword: "analysis",
  },
  {
    label: "Budget Review",
    description: "Review budget allocation, ROAS, and spending",
    icon: DollarSign,
    message: "Review budget allocation and ROAS",
    workflowKeyword: "analysis",
  },
]

interface WelcomeScreenProps {
  onSend: (message: string) => void
  onFileUpload: (file: File) => void
  onSelectWorkflow?: (id: string | null) => void
  disabled?: boolean
}

export function WelcomeScreen({ onSend, onFileUpload, onSelectWorkflow, disabled }: WelcomeScreenProps) {
  const [workflows, setWorkflows] = useState<AgentWorkflowDefinition[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    AgentAPI.listWorkflows()
      .then((data) => setWorkflows(data.filter((w) => w.status === "active")))
      .catch(() => {})
  }, [])

  const findWorkflow = (keyword: string) =>
    workflows.find((w) => w.name.toLowerCase().includes(keyword))

  const handleTemplateClick = (tpl: (typeof TEMPLATES)[number]) => {
    const wf = findWorkflow(tpl.workflowKeyword)
    if (wf && onSelectWorkflow) {
      onSelectWorkflow(wf.id)
    }
    onSend(tpl.message)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onFileUpload(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            What do you want to analyze today?
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload a CSV or Excel file to start, or choose a template below.
          </p>
        </div>

        {/* Primary upload CTA */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleUploadClick}
            disabled={disabled}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Upload &amp; Analyze
          </button>
          <span className="text-xs text-muted-foreground">
            Supported: CSV, XLSX, XLS (max 10 MB)
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Input */}
        <ChatInput
          onSend={onSend}
          onFileUpload={onFileUpload}
          disabled={disabled}
          placeholder="Or type your question..."
        />

        {/* Quick templates */}
        <div className="space-y-3">
          <p className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Quick Start Templates
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {TEMPLATES.map((tpl) => {
              const Icon = tpl.icon
              const wf = findWorkflow(tpl.workflowKeyword)
              return (
                <button
                  key={tpl.label}
                  onClick={() => handleTemplateClick(tpl)}
                  disabled={disabled}
                  className="group flex flex-col items-start gap-1 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50 w-[200px]"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    <span className="text-sm font-medium text-foreground">{tpl.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    {tpl.description}
                  </span>
                  {wf && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      <Workflow className="h-2.5 w-2.5" />
                      {wf.name}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
