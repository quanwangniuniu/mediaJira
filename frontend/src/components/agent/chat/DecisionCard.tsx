"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SuggestedDecision } from "@/types/agent"

const riskColors = {
  LOW: { bg: "bg-green-500/20", text: "text-green-400" },
  MEDIUM: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  HIGH: { bg: "bg-red-500/20", text: "text-red-400" },
} as const

interface DecisionCardProps {
  decision: SuggestedDecision
  onCreateDecision?: () => void
  onDismiss?: () => void
}

export function DecisionCard({ decision, onCreateDecision, onDismiss }: DecisionCardProps) {
  const risk = riskColors[decision.risk_level] || riskColors.MEDIUM
  const confidencePct = Math.min(Math.max((decision.confidence / 5) * 100, 0), 100)

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 shrink-0">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold text-card-foreground">
              {decision.title}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        {decision.context_summary && (
          <p className="text-sm text-muted-foreground">{decision.context_summary}</p>
        )}
        {decision.reasoning && (
          <p className="text-sm text-muted-foreground italic">{decision.reasoning}</p>
        )}

        {/* Risk + Confidence */}
        <div className="flex items-center gap-4">
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", risk.bg, risk.text)}>
            Risk: {decision.risk_level}
          </span>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-muted-foreground">Confidence</span>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${confidencePct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{decision.confidence}/5</span>
          </div>
        </div>

        {/* Options */}
        {decision.options && decision.options.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Options:</span>
            <ul className="text-sm text-foreground space-y-1">
              {decision.options.map((opt, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                  <span>{opt.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" onClick={onCreateDecision}>
            Create Decision
          </Button>
          <Button size="sm" variant="outline" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
