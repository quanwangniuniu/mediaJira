"use client"

import { useState } from "react"
import { useAgentLayout } from "../AgentLayoutContext"
import { cn } from "@/lib/utils"
import { AnomalyAlerts } from "../overview/AnomalyAlerts"
import { RecentDecisions } from "../overview/RecentDecisions"

type TabValue = "alerts" | "decisions" | "notes"

const tabs: { value: TabValue; label: string }[] = [
  { value: "alerts", label: "Alerts" },
  { value: "decisions", label: "Decisions" },
  { value: "notes", label: "Notes" },
]

export function RightPanel() {
  const { isRightPanelOpen } = useAgentLayout()
  const [notes, setNotes] = useState("")
  const [activeTab, setActiveTab] = useState<TabValue>("alerts")

  return (
    <div
      className={cn(
        "h-full border-l border-border bg-background transition-all duration-300 overflow-hidden",
        isRightPanelOpen ? "w-80" : "w-0"
      )}
    >
      <div className="w-80 h-full flex flex-col">
        {/* Custom Tab Buttons */}
        <div className="flex border-b border-border px-2 pt-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.value
                  ? "border-blue-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-card-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Alerts Tab */}
          <div className={cn("p-3", activeTab !== "alerts" && "hidden")}>
            <AnomalyAlerts anomalies={[]} loading={false} compact />
          </div>

          {/* Decisions Tab */}
          <div className={cn("p-3", activeTab !== "decisions" && "hidden")}>
            <RecentDecisions compact />
          </div>

          {/* Notes Tab */}
          <div className={cn("flex-1 flex flex-col px-3 py-2", activeTab !== "notes" && "hidden")}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Type notes here... (Markdown supported)"
              className="w-full h-full min-h-[200px] bg-card border border-border rounded-lg p-3 text-sm text-card-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
