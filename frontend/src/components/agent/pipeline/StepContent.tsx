"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, TrendingDown, HelpCircle, ArrowRight, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgentView } from "@/components/agent/AgentLayoutContext"

/* ---------- Step 2: Analyze ---------- */

const severityConfig = {
  critical: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/20" },
  high: { icon: TrendingDown, color: "text-orange-400", bg: "bg-orange-500/20" },
  medium: { icon: HelpCircle, color: "text-yellow-400", bg: "bg-yellow-500/20" },
}

function AnalyzeStep({ onNext, analysisData }: { onNext: () => void; analysisData: Record<string, unknown> | null }) {
  const anomalies = analysisData?.anomalies as { metric?: string; description?: string; scope_value?: string; movement?: string }[] || []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Anomaly Analysis</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {anomalies.length > 0
            ? `${anomalies.length} anomalies detected across your campaigns. Review and proceed to decisions.`
            : "Waiting for analysis results. Send a message to the AI agent to analyze your data."}
        </p>
      </div>

      {anomalies.length > 0 && (
        <div className="flex flex-col gap-3">
          {anomalies.map((anomaly, i) => {
            const severity = (anomaly.movement?.includes("SHARP") ? "critical" : anomaly.movement?.includes("MODERATE") ? "high" : "medium") as keyof typeof severityConfig
            const config = severityConfig[severity]
            const Icon = config.icon
            return (
              <Card key={i} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", config.bg)}>
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-sm font-semibold text-card-foreground">
                        {anomaly.metric || "Anomaly"}: {anomaly.scope_value || "Unknown"}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{anomaly.description || "No details available"}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={onNext} className="gap-2">
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/* ---------- Step 3: Decide ---------- */

function DecideStep({
  onNext,
  setActiveView,
  decisionData,
}: {
  onNext: () => void
  setActiveView: (view: AgentView) => void
  decisionData: Record<string, unknown> | null
}) {
  const decisionId = decisionData?.decision_id as string | number | undefined

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Decision Drafted</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {decisionId
            ? "A decision draft has been created based on the anomaly analysis."
            : "Ask the AI agent to create a decision draft from the analysis results."}
        </p>
      </div>

      {decisionId && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-card-foreground">
                  Decision #{String(decisionId)} has been drafted.
                </p>
                <p className="text-sm text-muted-foreground">
                  Open the Decision Editor to review details, add signals, and set options.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => setActiveView("decisions")}
        >
          Open Decision Editor
        </Button>
        <Button onClick={onNext} className="gap-2">
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/* ---------- Step 4: Execute ---------- */

function ExecuteStep({ taskData }: { taskData: Record<string, unknown> | null }) {
  const taskIds = (taskData?.task_ids as number[]) || []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Execute Tasks</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {taskIds.length > 0
            ? `${taskIds.length} tasks have been created based on your approved decision.`
            : "Ask the AI agent to create tasks from the decision."}
        </p>
      </div>

      {taskIds.length > 0 && (
        <div className="flex flex-col gap-3">
          {taskIds.map((taskId) => (
            <Card key={taskId} className="bg-card border-border">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/20">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-card-foreground">Task #{taskId}</p>
                    <p className="text-xs text-muted-foreground">Created successfully</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button className="gap-2" disabled={taskIds.length === 0}>
          View All Tasks
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/* ---------- Export ---------- */

interface StepContentProps {
  step: number
  onNext: () => void
  setActiveView: (view: AgentView) => void
  analysisData?: Record<string, unknown> | null
  decisionData?: Record<string, unknown> | null
  taskData?: Record<string, unknown> | null
}

export function StepContent({ step, onNext, setActiveView, analysisData, decisionData, taskData }: StepContentProps) {
  switch (step) {
    case 2:
      return <AnalyzeStep onNext={onNext} analysisData={analysisData || null} />
    case 3:
      return <DecideStep onNext={onNext} setActiveView={setActiveView} decisionData={decisionData || null} />
    case 4:
      return <ExecuteStep taskData={taskData || null} />
    default:
      return null
  }
}
