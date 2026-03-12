"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, TrendingDown, Info } from "lucide-react"
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

interface AnomalyCardProps {
  anomalies: AnomalyItem[]
}

export function AnomalyCard({ anomalies }: AnomalyCardProps) {
  if (!anomalies.length) return null

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-semibold text-foreground">
        Anomalies ({anomalies.length})
      </h4>
      {anomalies.map((anomaly, i) => {
        const severity = getSeverity(anomaly)
        const config = severityConfig[severity]
        const Icon = config.icon
        return (
          <Card key={i} className="bg-card border-border">
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
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <p className="text-sm text-muted-foreground">{anomaly.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
