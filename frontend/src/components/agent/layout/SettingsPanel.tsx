"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { getDebugMode, setDebugMode } from "@/lib/agentDebug"

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [debugEnabled, setDebugEnabled] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)

  // Sync from localStorage on mount
  useEffect(() => {
    setDebugEnabled(getDebugMode())
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleToggle = () => {
    const next = !debugEnabled
    setDebugEnabled(next)
    setDebugMode(next)
  }

  return (
    <div
      ref={panelRef}
      className="absolute bottom-14 left-2 right-2 z-50 bg-card border border-input rounded-lg shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-medium text-foreground">Settings</span>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-card-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-card-foreground">Debug Mode</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Log agent events to browser console
            </p>
          </div>
          <button
            onClick={handleToggle}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              debugEnabled ? "bg-blue-600" : "bg-input"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                debugEnabled ? "translate-x-[18px]" : "translate-x-[3px]"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
