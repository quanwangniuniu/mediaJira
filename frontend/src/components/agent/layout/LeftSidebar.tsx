"use client"

import { useEffect, useState } from "react"
import { LayoutDashboard, Table, GitBranch, CheckSquare, Bot, Settings } from "lucide-react"
import { useAgentLayout, type AgentView } from "../AgentLayoutContext"
import { cn } from "@/lib/utils"
import { AgentAPI } from "@/lib/api/agentApi"
import { SettingsPanel } from "./SettingsPanel"

const navItems: { id: AgentView; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "spreadsheets", label: "Spreadsheets", icon: Table },
  { id: "decisions", label: "Decisions", icon: GitBranch },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "agent", label: "AI Agent", icon: Bot },
]

const workflowSteps = [
  { step: 1, label: "Import Data", active: true },
  { step: 2, label: "Analyze", active: false },
  { step: 3, label: "Draft Decisions", active: false },
  { step: 4, label: "Review & Approve", active: false },
  { step: 5, label: "Execute", active: false },
]

interface SessionItem {
  title: string
  time: string
}

function formatTimeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return "Just now"
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return "Yesterday"
    return `${days} days ago`
  } catch {
    return iso
  }
}

export function LeftSidebar() {
  const { activeView, setActiveView } = useAgentLayout()
  const [recentSessions, setRecentSessions] = useState<SessionItem[]>([])
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const sessions = await AgentAPI.listSessions()
        if (cancelled) return
        setRecentSessions(
          sessions.slice(0, 5).map((s: { title?: string | null; created_at: string }) => ({
            title: s.title || "Untitled session",
            time: formatTimeAgo(s.created_at),
          }))
        )
      } catch {
        // keep empty
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="w-60 h-full bg-background border-r border-border flex flex-col">
      {/* Project Header */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">MediaJira</span>
          <span className="relative flex h-2 w-2" title="Connected">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">AI Agent Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        <div className="px-3 mb-2">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Workspaces</span>
        </div>
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeView === id
          return (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-2",
                isActive
                  ? "border-blue-500 bg-muted/50 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-border">
        {/* Workflow Progress */}
        <div className="px-4 py-3">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Workflow</span>
          <div className="mt-2">
            {workflowSteps.map(({ step, label, active }, index) => (
              <div key={step}>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                      active
                        ? "bg-blue-500 text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {step}
                  </div>
                  <span className={cn("text-xs", active ? "text-foreground" : "text-muted-foreground")}>
                    {label}
                  </span>
                </div>
                {/* Connection line between steps */}
                {index < workflowSteps.length - 1 && (
                  <div className="flex ml-[9px]">
                    <div className={cn(
                      "w-px h-2",
                      active ? "bg-blue-500/50" : "bg-muted"
                    )} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="px-4 py-3 border-t border-border">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Recent</span>
          <div className="mt-2 space-y-1.5">
            {recentSessions.length === 0 ? (
              <span className="text-xs text-muted-foreground/60">No recent sessions</span>
            ) : (
              recentSessions.map(({ title, time }) => (
                <div key={title} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">{title}</span>
                  <span className="text-[10px] text-muted-foreground/60">{time}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="relative px-4 py-3 border-t border-border">
          <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
          <button
            onClick={() => setShowSettings((prev) => !prev)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-card-foreground transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </div>
  )
}
