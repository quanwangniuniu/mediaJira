"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type AgentView = "overview" | "spreadsheets" | "decisions" | "tasks" | "agent"
export type AgentTheme = "light" | "dark" | "system"

interface AgentLayoutContextType {
  activeView: AgentView
  setActiveView: (view: AgentView) => void
  isRightPanelOpen: boolean
  toggleRightPanel: () => void
  theme: AgentTheme
  setTheme: (theme: AgentTheme) => void
  resolvedTheme: "light" | "dark"
}

const AgentLayoutContext = createContext<AgentLayoutContextType | null>(null)

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function AgentLayoutProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveViewState] = useState<AgentView>("overview")
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true)
  const [theme, setThemeState] = useState<AgentTheme>("dark")
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("dark")

  const setActiveView = (view: AgentView) => {
    setActiveViewState(view)
    sessionStorage.setItem("agent-active-view", view)
  }

  // Load persisted view + theme on mount
  useEffect(() => {
    const storedView = sessionStorage.getItem("agent-active-view") as AgentView | null
    if (storedView && ["overview", "spreadsheets", "decisions", "tasks", "agent"].includes(storedView)) {
      setActiveViewState(storedView)
    }
    const stored = localStorage.getItem("agent-theme") as AgentTheme | null
    if (stored && ["light", "dark", "system"].includes(stored)) {
      setThemeState(stored)
    }
    setSystemTheme(getSystemTheme())
  }, [])

  // Listen for OS theme changes
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? "dark" : "light")
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  const setTheme = (t: AgentTheme) => {
    setThemeState(t)
    localStorage.setItem("agent-theme", t)
  }

  const resolvedTheme = theme === "system" ? systemTheme : theme

  return (
    <AgentLayoutContext.Provider
      value={{
        activeView,
        setActiveView,
        isRightPanelOpen,
        toggleRightPanel: () => setIsRightPanelOpen((prev) => !prev),
        theme,
        setTheme,
        resolvedTheme,
      }}
    >
      {children}
    </AgentLayoutContext.Provider>
  )
}

export function useAgentLayout() {
  const ctx = useContext(AgentLayoutContext)
  if (!ctx) throw new Error("useAgentLayout must be used within AgentLayoutProvider")
  return ctx
}
