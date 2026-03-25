"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Workflow } from "lucide-react"
import { AgentAPI } from "@/lib/api/agentApi"
import type { AgentWorkflowDefinition } from "@/types/agent"

interface WorkflowSelectorProps {
  selectedId: string | null
  onSelect: (id: string | null) => void
  disabled?: boolean
}

export function WorkflowSelector({ selectedId, onSelect, disabled }: WorkflowSelectorProps) {
  const [workflows, setWorkflows] = useState<AgentWorkflowDefinition[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    AgentAPI.listWorkflows()
      .then((data) => {
        setWorkflows(data.filter((w) => w.status === "active"))
        // Auto-select default if none selected
        if (!selectedId) {
          const defaultWf = data.find((w) => w.is_default && w.status === "active")
          if (defaultWf) onSelect(defaultWf.id)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const selected = workflows.find((w) => w.id === selectedId)
  const displayName = selected
    ? `${selected.name}${selected.is_system ? " (System)" : ""}`
    : "Default Workflow"

  if (loading) return null

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
      >
        <Workflow className="h-3 w-3" />
        <span className="max-w-[160px] truncate">{displayName}</span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full left-0 mb-1 z-50 w-64 rounded-lg border border-border bg-background shadow-lg overflow-hidden">
            <div className="max-h-48 overflow-y-auto py-1">
              {workflows.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => {
                    onSelect(wf.id)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors ${
                    wf.id === selectedId ? "bg-muted/50" : ""
                  }`}
                >
                  <Workflow className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">
                      {wf.name}
                      {wf.is_system && (
                        <span className="ml-1 text-[10px] text-muted-foreground">(System)</span>
                      )}
                    </div>
                    {wf.description && (
                      <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {wf.description}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {wf.step_count ?? 0} steps
                    </div>
                  </div>
                </button>
              ))}
              {workflows.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No workflows available
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
