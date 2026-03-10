"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
  id: number
  label: string
}

interface StepProgressProps {
  steps: Step[]
  currentStep: number
  completedSteps: number[]
}

export function StepProgress({ steps, currentStep, completedSteps }: StepProgressProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep
        const isCompleted = completedSteps.includes(step.id)
        const isLast = index === steps.length - 1

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-all",
                  isActive && "border-primary bg-primary text-primary-foreground",
                  isCompleted && "border-success bg-success text-success-foreground",
                  !isActive && !isCompleted && "border-muted-foreground/40 bg-transparent text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-sm font-medium transition-colors",
                  isActive && "text-foreground",
                  isCompleted && "text-success",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "mx-3 h-0.5 w-16 sm:w-24 transition-colors",
                  isCompleted ? "bg-success" : "bg-muted-foreground/30"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
