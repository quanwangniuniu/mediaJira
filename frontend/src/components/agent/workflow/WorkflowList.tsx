"use client"

import { useState, useEffect } from "react"
import { Plus, Workflow, Lock, Trash2, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AgentAPI } from "@/lib/api/agentApi"
import { cn } from "@/lib/utils"
import type { AgentWorkflowDefinition } from "@/types/agent"
import { WorkflowDetail } from "./WorkflowDetail"

export function WorkflowList() {
  const [workflows, setWorkflows] = useState<AgentWorkflowDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const loadWorkflows = async () => {
    try {
      const data = await AgentAPI.listWorkflows()
      setWorkflows(data)
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkflows()
  }, [])

  const handleCreate = async () => {
    if (creating) return
    setCreating(true)
    try {
      const wf = await AgentAPI.createWorkflow({
        name: "New Workflow",
        description: "",
        status: "draft",
      })
      setWorkflows((prev) => [wf, ...prev])
      setSelectedId(wf.id)
    } catch {
      // handle error silently
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await AgentAPI.deleteWorkflow(id)
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
      if (selectedId === id) setSelectedId(null)
    } catch {
      // handle error silently
    }
  }

  const handleUpdate = (updated: AgentWorkflowDefinition) => {
    setWorkflows((prev) =>
      prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w))
    )
  }

  if (selectedId) {
    return (
      <WorkflowDetail
        workflowId={selectedId}
        onBack={() => {
          setSelectedId(null)
          loadWorkflows()
        }}
        onUpdate={handleUpdate}
      />
    )
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-emerald-500/10 text-emerald-600",
      draft: "bg-amber-500/10 text-amber-600",
      archived: "bg-muted text-muted-foreground",
    }
    return (
      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", colors[status] || colors.draft)}>
        {status}
      </span>
    )
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Workflows</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define and manage agent workflow templates
          </p>
        </div>
        <Button onClick={handleCreate} disabled={creating} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Workflow
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
          Loading workflows...
        </div>
      ) : workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
          <Workflow className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">No workflows yet</p>
          <p className="text-xs mt-1">Create a workflow to define custom agent steps</p>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors cursor-pointer group"
              onClick={() => setSelectedId(wf.id)}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 shrink-0">
                {wf.is_system ? (
                  <Lock className="h-4 w-4 text-primary" />
                ) : (
                  <Workflow className="h-4 w-4 text-primary" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {wf.name}
                  </span>
                  {statusBadge(wf.status)}
                  {wf.is_default && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                      default
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {wf.description || "No description"}
                  <span className="ml-2 text-muted-foreground/50">
                    {wf.step_count ?? 0} steps
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!wf.is_system && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(wf.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                    title="Delete workflow"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
