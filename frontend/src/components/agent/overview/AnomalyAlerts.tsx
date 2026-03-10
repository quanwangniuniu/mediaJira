"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, AlertCircle, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AGENT_MESSAGES } from "@/lib/agentMessages"

interface Alert {
  id: number
  severity: "critical" | "warning" | "info"
  metric: string
  campaign: string
  delta: string
}

interface AnomalyAlertsProps {
  anomalies: {
    type: string
    severity: string
    campaign: string
    description: string
    cost: number
    roas?: number
  }[]
  loading: boolean
}

const severityStyles = {
  critical: {
    icon: AlertTriangle,
    iconColor: "text-red-400",
    deltaColor: "text-red-400",
  },
  warning: {
    icon: AlertCircle,
    iconColor: "text-amber-400",
    deltaColor: "text-amber-400",
  },
  info: {
    icon: AlertCircle,
    iconColor: "text-blue-400",
    deltaColor: "text-blue-400",
  },
}

function mapSeverity(s: string): "critical" | "warning" | "info" {
  if (s === "critical") return "critical"
  if (s === "high") return "warning"
  return "info"
}

export function AnomalyAlerts({ anomalies, loading }: AnomalyAlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    if (anomalies.length > 0) {
      setAlerts(
        anomalies.map((a, i) => ({
          id: i + 1,
          severity: mapSeverity(a.severity),
          metric: a.description,
          campaign: a.campaign,
          delta: a.roas !== undefined ? `ROAS: ${a.roas}` : `$${a.cost.toLocaleString()}`,
        }))
      )
    }
  }, [anomalies])

  const dismissAlert = (id: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-300">Anomaly Alerts</CardTitle>
          <span className="text-xs text-zinc-500">{alerts.length} active</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {loading ? (
          <p className="text-sm text-zinc-500 text-center py-4">Loading alerts...</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-4">{AGENT_MESSAGES.EMPTY_ANOMALY_ALERTS}</p>
        ) : (
          alerts.map((alert) => {
            const style = severityStyles[alert.severity]
            const Icon = style.icon
            return (
              <div
                key={alert.id}
                className="flex items-center gap-3 rounded-lg bg-zinc-800/50 px-3 py-2"
              >
                <Icon className={cn("w-4 h-4 shrink-0", style.iconColor)} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-zinc-200">{alert.metric}</span>
                  <span className="text-xs text-zinc-500 ml-2">{alert.campaign}</span>
                </div>
                <span className={cn("text-xs font-medium shrink-0", style.deltaColor)}>
                  {alert.delta}
                </span>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-400 hover:text-blue-300 px-2 shrink-0">
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-300 shrink-0"
                  onClick={() => dismissAlert(alert.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
