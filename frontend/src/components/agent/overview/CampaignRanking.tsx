"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface CampaignItem {
  name: string
  cost: number
  revenue: number
  roas: number
}

interface CampaignRankingProps {
  topCampaigns?: CampaignItem[]
  bottomCampaigns?: CampaignItem[]
}

function truncateName(name: string, max = 18) {
  return name.length > max ? name.slice(0, max) + "…" : name
}

export function CampaignRanking({ topCampaigns = [], bottomCampaigns = [] }: CampaignRankingProps) {
  const hasData = topCampaigns.length > 0 || bottomCampaigns.length > 0

  if (!hasData) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-card-foreground">Campaign Performance</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No campaign data</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Import CSV to analyze campaign ROAS</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const topData = topCampaigns.map((c) => ({
    name: truncateName(c.name),
    roas: c.roas,
  }))

  const bottomData = bottomCampaigns.map((c) => ({
    name: truncateName(c.name),
    roas: c.roas,
  }))

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium text-card-foreground">Campaign Performance</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {topData.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Top 5 by ROAS</p>
            <ResponsiveContainer width="100%" height={topData.length * 32 + 16}>
              <BarChart data={topData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(value) => [`${Number(value).toFixed(2)}x`, "ROAS"]}
                />
                <Bar dataKey="roas" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {topData.map((_, i) => (
                    <Cell key={i} fill="hsl(152, 69%, 53%)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {bottomData.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Bottom 5 by ROAS</p>
            <ResponsiveContainer width="100%" height={bottomData.length * 32 + 16}>
              <BarChart data={bottomData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(value) => [`${Number(value).toFixed(2)}x`, "ROAS"]}
                />
                <Bar dataKey="roas" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {bottomData.map((_, i) => (
                    <Cell key={i} fill="hsl(0, 84%, 60%)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
