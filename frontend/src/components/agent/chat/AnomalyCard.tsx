"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, TrendingDown, Info, ChevronDown, ChevronRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AnomalyItem } from "@/types/agent"

const severityConfig = {
  critical: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/20", label: "Critical" },
  warning: { icon: TrendingDown, color: "text-orange-400", bg: "bg-orange-500/20", label: "Warning" },
  info: { icon: Info, color: "text-green-400", bg: "bg-green-500/20", label: "Info" },
} as const

function getSeverity(anomaly: AnomalyItem): keyof typeof severityConfig {
  if (anomaly.severity) return anomaly.severity
  const movement = anomaly.movement || ""
  if (movement.includes("SHARP")) return "critical"
  if (movement.includes("MODERATE")) return "warning"
  return "info"
}

function handleAddToPanel(anomaly: AnomalyItem) {
  window.dispatchEvent(new CustomEvent("agent:add-alert", { detail: anomaly }))
}

function AnomalyItemRow({ anomaly }: { anomaly: AnomalyItem }) {
  const severity = getSeverity(anomaly)
  const config = severityConfig[severity]
  const Icon = config.icon

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", config.bg)}>
            <Icon className={cn("h-4 w-4", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold text-card-foreground truncate">
              {anomaly.metric}
              {anomaly.campaign && `: ${anomaly.campaign}`}
              {anomaly.ad_set && ` / ${anomaly.ad_set}`}
            </CardTitle>
          </div>
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full shrink-0", config.bg, config.color)}>
            {config.label}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => handleAddToPanel(anomaly)}
          >
            <Plus className="h-3 w-3 mr-0.5" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <p className="text-sm text-muted-foreground">{anomaly.description}</p>
      </CardContent>
    </Card>
  )
}

interface CollapsibleSectionProps {
  title: string
  count: number
  defaultExpanded: boolean
  children: React.ReactNode
}

function CollapsibleSection({ title, count, defaultExpanded, children }: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full text-left py-1"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-sm font-semibold text-foreground">
          {title} ({count})
        </span>
      </button>
      {expanded && <div className="flex flex-col gap-2 mt-1">{children}</div>}
    </div>
  )
}

interface AnomalyCardProps {
  anomalies: AnomalyItem[]
}

export function AnomalyCard({ anomalies }: AnomalyCardProps) {
  if (!anomalies.length) return null

  const alerts = anomalies.filter((a) => {
    const sev = getSeverity(a)
    return sev === "critical" || sev === "warning"
  })
  const signals = anomalies.filter((a) => getSeverity(a) === "info")

  return (
    <div className="flex flex-col gap-3">
      {alerts.length > 0 && (
        <CollapsibleSection title="Alerts" count={alerts.length} defaultExpanded={true}>
          {alerts.map((anomaly, i) => (
            <AnomalyItemRow key={`alert-${i}`} anomaly={anomaly} />
          ))}
        </CollapsibleSection>
      )}
      {signals.length > 0 && (
        <CollapsibleSection title="Signals" count={signals.length} defaultExpanded={false}>
          {signals.map((anomaly, i) => (
            <AnomalyItemRow key={`signal-${i}`} anomaly={anomaly} />
          ))}
        </CollapsibleSection>
      )}
    </div>
  )
}
