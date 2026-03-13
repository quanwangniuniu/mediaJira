"use client"

import { useCallback, useEffect, useState } from "react"
import { Bot, ChevronRight, ChevronLeft, X, Sparkles } from "lucide-react"
import { tourSteps } from "./tourSteps"

interface AgentTourProps {
  onComplete: () => void
}

export function AgentTour({ onComplete }: AgentTourProps) {
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [tooltipPos, setTooltipPos] = useState<"bottom" | "right" | "left">("bottom")

  const current = tourSteps[step]
  const isFirst = step === 0
  const isLast = step === tourSteps.length - 1
  const isModal = current.type === "modal"

  // Measure target element for spotlight steps
  const measureTarget = useCallback(() => {
    if (current.type !== "spotlight" || !current.target) {
      setTargetRect(null)
      return
    }
    const el = document.querySelector(`[data-tour="${current.target}"]`)
    if (!el) {
      setTargetRect(null)
      return
    }
    const rect = el.getBoundingClientRect()
    setTargetRect(rect)

    // Decide tooltip position based on available space
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceRight = window.innerWidth - rect.right
    if (spaceBelow > 200) {
      setTooltipPos("bottom")
    } else if (spaceRight > 340) {
      setTooltipPos("right")
    } else {
      setTooltipPos("left")
    }
  }, [current])

  useEffect(() => {
    measureTarget()
    window.addEventListener("resize", measureTarget)
    return () => window.removeEventListener("resize", measureTarget)
  }, [measureTarget])

  const handleNext = () => {
    if (isLast) {
      onComplete()
    } else {
      setStep((s) => s + 1)
    }
  }

  const handlePrev = () => {
    if (!isFirst) setStep((s) => s - 1)
  }

  const handleSkip = () => {
    onComplete()
  }

  // Tooltip position styles for spotlight steps
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return {}
    const pad = 16
    if (tooltipPos === "bottom") {
      return {
        position: "fixed",
        top: targetRect.bottom + pad,
        left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 336)),
        zIndex: 9999,
      }
    }
    if (tooltipPos === "right") {
      return {
        position: "fixed",
        top: Math.max(16, targetRect.top),
        left: targetRect.right + pad,
        zIndex: 9999,
      }
    }
    // left
    return {
      position: "fixed",
      top: Math.max(16, targetRect.top),
      left: Math.max(16, targetRect.left - 320 - pad),
      zIndex: 9999,
    }
  }

  return (
    <div className="fixed inset-0 z-[9997]">
      {/* Overlay */}
      {isModal ? (
        // Full dark overlay for modal steps
        <div className="absolute inset-0 bg-black/70" />
      ) : targetRect ? (
        // Spotlight cutout via box-shadow
        <div
          style={{
            position: "fixed",
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.7)",
            borderRadius: "12px",
            zIndex: 9998,
            pointerEvents: "none",
            transition: "all 0.3s ease-in-out",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/70" />
      )}

      {/* Click blocker for non-spotlight areas */}
      <div className="absolute inset-0" style={{ zIndex: 9998 }} onClick={(e) => e.stopPropagation()} />

      {/* Modal card (centered) */}
      {isModal && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-[400px] p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            {isFirst ? (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Bot className="w-8 h-8 text-white" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            )}
            <h2 className="text-xl font-bold text-foreground mb-2">{current.title}</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{current.description}</p>
            <div className="flex items-center justify-center gap-3">
              {isFirst && (
                <>
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip Tour
                  </button>
                  <button
                    onClick={handleNext}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    Start Tour
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
              {isLast && (
                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Get Started
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spotlight tooltip card */}
      {!isModal && (
        <div style={getTooltipStyle()}>
          <div className="bg-card border border-border rounded-xl shadow-2xl w-[320px] p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mb-3">
              {tourSteps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i === step ? "w-5 bg-blue-500" : i < step ? "w-2 bg-blue-500/40" : "w-2 bg-muted"
                  }`}
                />
              ))}
            </div>

            <h3 className="text-sm font-semibold text-foreground mb-1.5">{current.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">{current.description}</p>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground/60">
                {step} of {tourSteps.length - 1}
              </span>
              <div className="flex items-center gap-2">
                {step > 1 && (
                  <button
                    onClick={handlePrev}
                    className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="px-4 py-1.5 bg-blue-500 text-white rounded-md text-xs font-medium hover:bg-blue-600 transition-colors flex items-center gap-1"
                >
                  {step === tourSteps.length - 2 ? "Finish" : "Next"}
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
