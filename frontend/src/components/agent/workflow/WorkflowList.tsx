"use client"

import { Workflow } from "lucide-react"

export function WorkflowList() {
  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Custom Workflows</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create and manage your own workflow templates
        </p>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
        <Workflow className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm font-medium">Under Development</p>
        <p className="text-xs mt-2 text-center max-w-sm leading-relaxed">
          Custom workflow creation will be available soon.
          You will be able to define and manage your own workflow templates here.
        </p>
      </div>
    </div>
  )
}
