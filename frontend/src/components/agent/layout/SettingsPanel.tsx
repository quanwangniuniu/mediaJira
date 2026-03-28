"use client"

import { useEffect, useRef, useState } from "react"
import { X, RotateCcw, Workflow, Loader2 } from "lucide-react"
import { getDebugMode, setDebugMode } from "@/lib/agentDebug"
import { AgentAPI } from "@/lib/api/agentApi"
import type { AgentWorkflowDefinition } from "@/types/agent"

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [debugEnabled, setDebugEnabled] = useState(true)
  const [workflows, setWorkflows] = useState<AgentWorkflowDefinition[]>([])
  const [workflowsLoading, setWorkflowsLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Sync from localStorage on mount
  useEffect(() => {
    setDebugEnabled(getDebugMode())
  }, [isOpen])

  // Fetch internal workflows when panel opens
  useEffect(() => {
    if (!isOpen) return
    setWorkflowsLoading(true)
    AgentAPI.listWorkflows()
      .then((data) =>
        setWorkflows(data.filter((w) => w.is_system && w.status === "active"))
      )
      .catch(() => setWorkflows([]))
      .finally(() => setWorkflowsLoading(false))
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleToggle = () => {
    const next = !debugEnabled
    setDebugEnabled(next)
    setDebugMode(next)
  }

  return (
    <div
      ref={panelRef}
      className="absolute bottom-14 left-2 right-2 z-50 bg-card border border-input rounded-lg shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-medium text-foreground">Settings</span>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-card-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-card-foreground">Debug Mode</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Log agent events to browser console
            </p>
          </div>
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              debugEnabled ? "bg-blue-600" : "bg-input"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                debugEnabled ? "translate-x-[18px]" : "translate-x-[3px]"
              }`}
            />
          </button>
        </div>

        {/* Restart Tour */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <span className="text-sm text-card-foreground">Agent Tour</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Replay the onboarding walkthrough
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("agent-tour-completed")
              window.dispatchEvent(new CustomEvent("agent:restart-tour"))
              onClose()
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restart
          </button>
        </div>

        {/* Internal Workflows */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <Workflow className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm text-card-foreground">Internal Workflows</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            System-managed workflow definitions
          </p>

          {workflowsLoading ? (
            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading...
            </div>
          ) : workflows.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">No active system workflows</p>
          ) : (
            <div className="space-y-1.5">
              {workflows.map((wf) => (
                <div
                  key={wf.id}
                  className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-card-foreground truncate block">
                      {wf.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {wf.step_count ?? 0} steps
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 shrink-0">
                    active
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
