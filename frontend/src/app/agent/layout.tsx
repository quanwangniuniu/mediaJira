"use client"

import { useEffect, useState } from "react"
import { AgentLayoutProvider, useAgentLayout } from "@/components/agent/AgentLayoutContext"
import { LeftSidebar } from "@/components/agent/layout/LeftSidebar"
import { TopBar } from "@/components/agent/layout/TopBar"
import { RightPanel } from "@/components/agent/layout/RightPanel"

function AgentThemeWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useAgentLayout()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Sync dark class on documentElement for Radix Portal compatibility
  useEffect(() => {
    if (resolvedTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
    return () => {
      document.documentElement.classList.remove("dark")
    }
  }, [resolvedTheme])

  return (
    <div className={resolvedTheme === "dark" ? "dark" : ""}>
      <div
        className={`h-screen flex bg-background text-foreground transition-opacity duration-200 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Left Sidebar */}
        <LeftSidebar />

        {/* Center: TopBar + Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>

        {/* Right Panel */}
        <RightPanel />
      </div>
    </div>
  )
}

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AgentLayoutProvider>
      <AgentThemeWrapper>{children}</AgentThemeWrapper>
    </AgentLayoutProvider>
  )
}
