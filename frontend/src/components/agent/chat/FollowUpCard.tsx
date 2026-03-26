"use client"

import { MessageSquarePlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FollowUpCardProps {
  active?: boolean
  onToggle?: () => void
}

export function FollowUpCard({ active = false, onToggle }: FollowUpCardProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 shrink-0">
            <MessageSquarePlus className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-sm font-semibold text-card-foreground">
            Follow-up Chat
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        <p className="text-sm text-foreground">
          {active
            ? "Follow-up chat is active. Ask a follow-up question, request a short report, or include an exact username/email for forwarding."
            : "Start a follow-up chat for this analysis when you want an explanation, a short report, or a forwarded message for a project member."}
        </p>
        <Button size="sm" variant="outline" onClick={onToggle}>
          {active ? "Close Follow-up" : "Start Follow-up"}
        </Button>
      </CardContent>
    </Card>
  )
}
