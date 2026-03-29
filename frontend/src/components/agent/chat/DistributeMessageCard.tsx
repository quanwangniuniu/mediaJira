"use client"

import { Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DistributeMessageCardProps {
  onDistribute?: () => void
}

export function DistributeMessageCard({ onDistribute }: DistributeMessageCardProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 shrink-0">
            <Send className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-sm font-semibold text-card-foreground">
            Distribute to Team
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        <p className="text-sm text-foreground">
          Send analysis summary and tasks to team members via chat.
        </p>
        <Button size="sm" variant="outline" onClick={onDistribute}>
          Send Message
        </Button>
      </CardContent>
    </Card>
  )
}
