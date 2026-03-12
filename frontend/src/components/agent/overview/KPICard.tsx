"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface KPICardProps {
  title: string
  value: string
  change: string
  changeType: "up" | "down" | "neutral"
  icon: React.ElementType
}

const badgeStyles = {
  up: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10",
  down: "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/10",
  neutral: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/10",
}

const iconBgStyles = {
  up: "bg-emerald-500/10",
  down: "bg-red-500/10",
  neutral: "bg-blue-500/10",
}

const iconColorStyles = {
  up: "text-emerald-400",
  down: "text-red-400",
  neutral: "text-blue-400",
}

const changeArrows = {
  up: "\u25B2",
  down: "\u25BC",
  neutral: "\u25CF",
}

export function KPICard({ title, value, change, changeType, icon: Icon }: KPICardProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", iconBgStyles[changeType])}>
            <Icon className={cn("w-5 h-5", iconColorStyles[changeType])} />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <Badge variant="outline" className={cn("text-[10px] font-medium", badgeStyles[changeType])}>
                {changeArrows[changeType]} {change}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
