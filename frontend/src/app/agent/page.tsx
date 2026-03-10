"use client"

import { useAgentLayout } from "@/components/agent/AgentLayoutContext"
import { OverviewDashboard } from "@/components/agent/overview/OverviewDashboard"
import { SpreadsheetView } from "@/components/agent/spreadsheet/SpreadsheetView"
import { TaskBoard } from "@/components/agent/taskboard/TaskBoard"
import { DecisionEditor } from "@/components/agent/decision/DecisionEditor"

export default function AgentPage() {
  const { activeView } = useAgentLayout()

  return (
    <div data-tour="tour-main-content" className="h-full">
      {activeView === "overview" && <OverviewDashboard />}
      {activeView === "spreadsheets" && <SpreadsheetView />}
      {activeView === "decisions" && <DecisionEditor />}
      {activeView === "tasks" && <TaskBoard />}
    </div>
  )
}
