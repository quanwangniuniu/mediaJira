"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { AGENT_MESSAGES } from "@/lib/agentMessages"

interface TrendPoint {
  date: string
  roas: number
  cost: number
  revenue: number
}

const chartConfig = {
  roas: {
    label: "ROAS",
    color: "#3b82f6",
  },
  cost: {
    label: "Cost",
    color: "#ef4444",
  },
  revenue: {
    label: "Revenue",
    color: "#22c55e",
  },
} satisfies ChartConfig

export function PerformanceChart() {
  const [data, setData] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Data report endpoints removed — chart will populate once new analysis flow is integrated
    setLoading(false)
  }, [])

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground">Performance Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Loading trend data...
            </div>
          ) : data.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              {AGENT_MESSAGES.EMPTY_PERFORMANCE_CHART}
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  stroke="#71717a"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#71717a"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}x`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#71717a"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="roas"
                  name="ROAS"
                  stroke="var(--color-roas)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cost"
                  name="Cost"
                  stroke="var(--color-cost)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
