"use client"

import { useEffect, useState } from "react"
import { DollarSign, Megaphone, AlertCircle, TrendingUp } from "lucide-react"
import { KPICard } from "./KPICard"
import { PerformanceChart } from "./PerformanceChart"
import { TaskStatusChart } from "./TaskStatusChart"
import { AnomalyAlerts } from "./AnomalyAlerts"
import { RecentDecisions } from "./RecentDecisions"
// AgentAPI removed — KPI data will come from pipeline analysis

const fallbackKpi: { title: string; value: string; change: string; changeType: "up" | "down" | "neutral"; icon: React.ElementType }[] = [
  { title: "Total Cost", value: "$—", change: "—", changeType: "neutral" as const, icon: DollarSign },
  { title: "Active Ads", value: "—", change: "—", changeType: "neutral" as const, icon: Megaphone },
  { title: "Anomalies", value: "—", change: "—", changeType: "neutral" as const, icon: AlertCircle },
  { title: "Avg ROAS", value: "—", change: "—", changeType: "neutral" as const, icon: TrendingUp },
]

interface Anomaly {
  type: string
  severity: string
  campaign: string
  description: string
  cost: number
  roas?: number
}

export function OverviewDashboard() {
  const [kpiData, setKpiData] = useState(fallbackKpi)
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [activeFilename, setActiveFilename] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // KPI data will be populated from pipeline analysis results in Phase 2
    setLoading(false)
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        {kpiData.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <PerformanceChart />
        </div>
        <TaskStatusChart />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-4">
        <AnomalyAlerts anomalies={anomalies} loading={loading} />
        <RecentDecisions />
      </div>
    </div>
  )
}
