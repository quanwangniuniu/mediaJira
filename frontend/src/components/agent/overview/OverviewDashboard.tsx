"use client"

import { useState } from "react"
import { DollarSign, Megaphone, AlertCircle, TrendingUp } from "lucide-react"
import { KPICard } from "./KPICard"
import { PerformanceChart } from "./PerformanceChart"
import { TaskStatusChart } from "./TaskStatusChart"
import { CampaignRanking } from "./CampaignRanking"
import { ActivityFeed } from "./ActivityFeed"

const fallbackKpi: { title: string; value: string; change: string; changeType: "up" | "down" | "neutral"; icon: React.ElementType }[] = [
  { title: "Total Cost", value: "$—", change: "—", changeType: "neutral" as const, icon: DollarSign },
  { title: "Active Ads", value: "—", change: "—", changeType: "neutral" as const, icon: Megaphone },
  { title: "Anomalies", value: "—", change: "—", changeType: "neutral" as const, icon: AlertCircle },
  { title: "Avg ROAS", value: "—", change: "—", changeType: "neutral" as const, icon: TrendingUp },
]

export function OverviewDashboard() {
  const [kpiData, setKpiData] = useState(fallbackKpi)

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
        <CampaignRanking />
        <ActivityFeed />
      </div>
    </div>
  )
}
