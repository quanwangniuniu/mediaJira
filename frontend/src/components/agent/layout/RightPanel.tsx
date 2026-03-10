"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, AlertCircle, Info, ChevronRight, ChevronDown } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAgentLayout } from "../AgentLayoutContext"
import { cn } from "@/lib/utils"
// AgentAPI removed — alerts will come from pipeline analysis

const severityConfig = {
  high: { icon: AlertTriangle, color: "text-red-400", borderColor: "border-l-red-500" },
  medium: { icon: AlertCircle, color: "text-amber-400", borderColor: "border-l-amber-500" },
  low: { icon: Info, color: "text-blue-400", borderColor: "border-l-blue-500" },
}

interface AlertItem {
  id: number
  severity: "high" | "medium" | "low"
  title: string
  time: string
  action: string
}

interface TreeNode {
  label: string
  children?: TreeNode[]
}

type TabValue = "alerts" | "explorer" | "notes"

const tabs: { value: TabValue; label: string }[] = [
  { value: "alerts", label: "Alerts" },
  { value: "explorer", label: "Data Explorer" },
  { value: "notes", label: "Notes" },
]

function TreeItem({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div>
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-1.5 py-1 text-xs hover:bg-muted/50 rounded transition-colors",
          hasChildren ? "text-card-foreground cursor-pointer" : "text-muted-foreground cursor-default"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
        ) : (
          <span className="w-3" />
        )}
        <span>{node.label}</span>
      </button>
      {open && node.children?.map((child) => (
        <TreeItem key={child.label} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export function RightPanel() {
  const { isRightPanelOpen } = useAgentLayout()
  const [notes, setNotes] = useState("")
  const [activeTab, setActiveTab] = useState<TabValue>("alerts")
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [dataTree, setDataTree] = useState<TreeNode[]>([])

  useEffect(() => {
    // Alerts and data explorer will be populated from pipeline analysis in Phase 2
  }, [])

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
          {activeTab === "alerts" && (
            <div className="space-y-2 p-3">
              {alerts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No alerts</p>
              ) : (
                alerts.map((alert) => {
                  const config = severityConfig[alert.severity]
                  const Icon = config.icon
                  return (
                    <Card key={alert.id} className={cn("border-l-2 bg-card border-border", config.borderColor)}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Icon className={cn("w-4 h-4 mt-0.5", config.color)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">{alert.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{alert.time}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs text-blue-400 hover:text-blue-300 p-0">
                          {alert.action}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          )}

          {/* Data Explorer Tab */}
          {activeTab === "explorer" && (
            <div className="px-2 py-2">
              {dataTree.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No data available</p>
              ) : (
                dataTree.map((node) => (
                  <TreeItem key={node.label} node={node} />
                ))
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === "notes" && (
            <div className="flex-1 flex flex-col px-3 py-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type notes here... (Markdown supported)"
                className="w-full h-full min-h-[200px] bg-card border border-border rounded-lg p-3 text-sm text-card-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
