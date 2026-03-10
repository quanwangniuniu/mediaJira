"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Plus,
  X,
  Check,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Target,
  DollarSign,
  FileText,
  Shield,
  ChevronLeft,
  Settings2,
  Trash2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import ConfirmDialog from "@/components/common/ConfirmDialog"
import { AgentAPI } from "@/lib/api/agentApi"
import { DecisionAPI } from "@/lib/api/decisionApi"
import { useBatchManage } from "@/hooks/useBatchManage"
import { useProjectStore } from "@/lib/projectStore"
import { useAgentLayout } from "@/components/agent/AgentLayoutContext"
import toast from "react-hot-toast"

// ─── Types ────────────────────────────────────────────

interface Signal {
  id: string
  type: "metric" | "trend" | "alert"
  label: string
  value: string
}

interface Option {
  id: string
  title: string
  description: string
  expectedImpact: string
  riskLevel: "low" | "medium" | "high"
}

interface ValidationItem {
  key: string
  label: string
  passed: boolean
}

interface DecisionListItem {
  id: number
  title: string
  status: string
  risk_level: string
  author: string
  created_at: string
}

const signalIcons = {
  metric: BarChart3,
  trend: TrendingUp,
  alert: AlertTriangle,
}

const riskColors: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
}

const statusStyles: Record<string, string> = {
  draft: "bg-muted/50 text-muted-foreground border-input",
  committed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  awaiting_approval: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  reviewed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  archived: "bg-purple-500/10 text-purple-400 border-purple-500/20",
}

// ─── Component ────────────────────────────────────────

export function DecisionEditor() {
  // Decision list mode vs edit mode
  const [viewMode, setViewMode] = useState<"list" | "edit">("list")
  const [decisionList, setDecisionList] = useState<DecisionListItem[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const batchDeleteFn = useCallback(async (id: string | number) => {
    await DecisionAPI.deleteDecision(Number(id))
  }, [])

  const batchDeleteComplete = useCallback((deletedIds: (string | number)[]) => {
    const idSet = new Set(deletedIds.map(Number))
    setDecisionList((prev) => prev.filter((d) => !idSet.has(d.id)))
    toast.success(`Deleted ${deletedIds.length} decision${deletedIds.length > 1 ? "s" : ""}`)
  }, [])

  const batch = useBatchManage({
    items: decisionList.map((d) => ({ id: d.id })),
    deleteFn: batchDeleteFn,
    onDeleteComplete: batchDeleteComplete,
  })

  // Editing state
  const [editingDecisionId, setEditingDecisionId] = useState<number | null>(null)
  const [editingStatus, setEditingStatus] = useState<string>("draft")
  const [isSaving, setIsSaving] = useState(false)
  const activeProject = useProjectStore((s) => s.activeProject)

  // Form state
  const [title, setTitle] = useState("")
  const [context, setContext] = useState("")
  const [reasoning, setReasoning] = useState("")
  const [signals, setSignals] = useState<Signal[]>([])
  const [options, setOptions] = useState<Option[]>([])
  const [selectedOption, setSelectedOption] = useState<string>("")
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium")

  // New signal form
  const [newSignalLabel, setNewSignalLabel] = useState("")
  const [newSignalValue, setNewSignalValue] = useState("")
  const [showNewSignal, setShowNewSignal] = useState(false)

  // New option form
  const [showNewOption, setShowNewOption] = useState(false)
  const [newOptionTitle, setNewOptionTitle] = useState("")
  const [newOptionDesc, setNewOptionDesc] = useState("")
  const [newOptionImpact, setNewOptionImpact] = useState("")
  const [newOptionRisk, setNewOptionRisk] = useState<"low" | "medium" | "high">("medium")

  // Load decision list
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await AgentAPI.fetchRecentDecisions()
        if (cancelled) return
        setDecisionList(data)
      } catch {
        // keep empty
      } finally {
        if (!cancelled) setListLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const loadDecision = async (d: DecisionListItem) => {
    // Set basic info immediately and switch to edit view
    setTitle(d.title)
    setPriority((d.risk_level as "low" | "medium" | "high") || "medium")
    setContext("")
    setReasoning("")
    setSignals([])
    setOptions([])
    setSelectedOption("")
    setEditingDecisionId(d.id)
    setEditingStatus(d.status || "draft")
    setViewMode("edit")

    // Fetch full decision detail to populate context, reasoning, signals, options
    try {
      let detail: { contextSummary?: string | null; reasoning?: string | null; options?: { text: string; isSelected: boolean }[]; signals?: { id: number; type: string; description: string; severity?: string | null }[] } | null = null

      // Try draft endpoint first, then committed
      try {
        detail = await DecisionAPI.getDraft(d.id)
      } catch {
        try {
          detail = await DecisionAPI.getDecision(d.id)
        } catch {
          // neither worked
        }
      }

      if (detail) {
        if (detail.contextSummary) setContext(detail.contextSummary)
        if (detail.reasoning) setReasoning(detail.reasoning)

        // Map API signals to local Signal type
        if (detail.signals && detail.signals.length > 0) {
          setSignals(detail.signals.map((s) => ({
            id: String(s.id),
            type: (s.type === "trend" ? "trend" : s.type === "alert" ? "alert" : "metric") as Signal["type"],
            label: s.description || "Signal",
            value: s.severity || "",
          })))
        }

        // Map API options to local Option type
        if (detail.options && detail.options.length > 0) {
          const mappedOptions = detail.options.map((o, i) => ({
            id: `o${i}-${Date.now()}`,
            title: o.text,
            description: "",
            expectedImpact: "",
            riskLevel: "medium" as const,
          }))
          setOptions(mappedOptions)
          // Set selected option
          const selectedIdx = detail.options.findIndex((o) => o.isSelected)
          if (selectedIdx >= 0) {
            setSelectedOption(mappedOptions[selectedIdx].id)
          }
        }
      }
    } catch {
      // Keep what we have from the list item
    }
  }

  const createNew = () => {
    setTitle("")
    setContext("")
    setReasoning("")
    setSignals([])
    setOptions([])
    setSelectedOption("")
    setPriority("medium")
    setEditingDecisionId(null)
    setEditingStatus("draft")
    setViewMode("edit")
  }

  // ─── Validation ─────────────────────────────────────

  const validationItems: ValidationItem[] = [
    { key: "title", label: "Title provided", passed: title.trim().length > 0 },
    { key: "context", label: "Context summary", passed: context.trim().length > 20 },
    { key: "signals", label: "At least 1 signal", passed: signals.length > 0 },
    { key: "reasoning", label: "Reasoning provided", passed: reasoning.trim().length > 20 },
    { key: "options", label: "At least 2 options", passed: options.length >= 2 },
    { key: "selected", label: "Recommendation selected", passed: selectedOption !== "" },
    { key: "priority", label: "Priority set", passed: priority !== undefined },
  ]

  const passedCount = validationItems.filter((v) => v.passed).length
  const allPassed = passedCount === validationItems.length

  // ─── Signal CRUD ────────────────────────────────────

  const addSignal = () => {
    if (!newSignalLabel.trim() || !newSignalValue.trim()) return
    const newSignal: Signal = {
      id: `s${Date.now()}`,
      type: "metric",
      label: newSignalLabel.trim(),
      value: newSignalValue.trim(),
    }
    setSignals((prev) => [...prev, newSignal])
    setNewSignalLabel("")
    setNewSignalValue("")
    setShowNewSignal(false)
  }

  const removeSignal = (id: string) => {
    setSignals((prev) => prev.filter((s) => s.id !== id))
  }

  // ─── Option CRUD ────────────────────────────────────

  const addOption = () => {
    if (!newOptionTitle.trim()) return
    const newOpt: Option = {
      id: `o${Date.now()}`,
      title: newOptionTitle.trim(),
      description: newOptionDesc.trim(),
      expectedImpact: newOptionImpact.trim(),
      riskLevel: newOptionRisk,
    }
    setOptions((prev) => [...prev, newOpt])
    setNewOptionTitle("")
    setNewOptionDesc("")
    setNewOptionImpact("")
    setNewOptionRisk("medium")
    setShowNewOption(false)
  }

  const removeOption = (id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id))
    if (selectedOption === id) setSelectedOption("")
  }

  // ─── Save / Submit ────────────────────────────────────

  const refreshList = async () => {
    try {
      const data = await AgentAPI.fetchRecentDecisions()
      setDecisionList(data)
    } catch {
      // ignore
    }
  }

  const saveDraft = async (skipLoadingState = false) => {
    if (!skipLoadingState) setIsSaving(true)
    try {
      const payload = {
        title,
        contextSummary: context,
        reasoning,
        riskLevel: priority.toUpperCase(),
        options: options.map((o) => ({
          text: o.title,
          isSelected: selectedOption === o.id,
        })),
      }

      let id = editingDecisionId
      if (!id) {
        const projectId = activeProject?.id
        if (!projectId) {
          toast.error("No active project selected")
          if (!skipLoadingState) setIsSaving(false)
          return null
        }
        const draft = await DecisionAPI.createDraft(projectId)
        id = draft.id
        setEditingDecisionId(id)
      }

      await DecisionAPI.patchDraft(id, payload)
      toast.success("Draft saved")
      await refreshList()
      return id
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || "Failed to save draft"
      toast.error(detail)
      return null
    } finally {
      if (!skipLoadingState) setIsSaving(false)
    }
  }

  const submitForReview = async () => {
    setIsSaving(true)
    try {
      const id = await saveDraft(true)
      if (!id) return
      await DecisionAPI.commit(id)
      toast.success("Decision submitted")
      await refreshList()
      setViewMode("list")
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || "Failed to submit"
      toast.error(detail)
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Consume pendingDecisionId from context ───────────────────

  const { pendingDecisionId, setPendingDecisionId } = useAgentLayout()

  useEffect(() => {
    if (!pendingDecisionId || listLoading) return
    const found = decisionList.find((d) => d.id === pendingDecisionId)
    if (found) {
      loadDecision(found)
    } else {
      loadDecision({ id: pendingDecisionId, title: "", status: "draft", risk_level: "", author: "", created_at: "" })
    }
    setPendingDecisionId(null)
  }, [pendingDecisionId, listLoading, decisionList])

  // ─── List View ────────────────────────────────────────

  if (viewMode === "list") {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header: normal mode vs manage mode */}
          {batch.isManaging ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={batch.isAllSelected ? true : batch.isIndeterminate ? "indeterminate" : false}
                  onCheckedChange={() => batch.isAllSelected ? batch.deselectAll() : batch.selectAll()}
                />
                <span className="text-sm text-muted-foreground">
                  {batch.selectedCount > 0 ? `${batch.selectedCount} selected` : "Select items"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={batch.selectedCount === 0 || batch.isDeleting}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete ({batch.selectedCount})
                </Button>
                <Button size="sm" variant="outline" onClick={batch.exitManageMode} disabled={batch.isDeleting}>
                  Exit
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-foreground">Decisions</h1>
                <p className="text-sm text-muted-foreground mt-1">View and manage advertising decisions</p>
              </div>
              <div className="flex items-center gap-2">
                {decisionList.length > 0 && (
                  <Button size="sm" variant="outline" onClick={batch.enterManageMode}>
                    <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                    Manage
                  </Button>
                )}
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={createNew}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  New Decision
                </Button>
              </div>
            </div>
          )}

          {listLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading decisions...</div>
          ) : decisionList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No decisions yet. Create one or run an AI analysis.
            </div>
          ) : (
            <div className="space-y-2">
              {decisionList.map((d) => (
                <div
                  key={d.id}
                  className={cn(
                    "transition-all duration-300",
                    batch.isExiting(d.id) && "opacity-0 scale-95 max-h-0 overflow-hidden"
                  )}
                >
                  <Card
                    className={cn(
                      "bg-card border-border cursor-pointer transition-colors",
                      batch.isManaging && batch.selectedIds.has(d.id)
                        ? "border-blue-500/50 bg-blue-500/5"
                        : "hover:border-input"
                    )}
                    onClick={() => {
                      if (batch.isManaging) {
                        batch.toggleSelect(d.id)
                      } else {
                        loadDecision(d)
                      }
                    }}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {batch.isManaging && (
                            <Checkbox
                              checked={batch.selectedIds.has(d.id)}
                              onCheckedChange={() => batch.toggleSelect(d.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <span className="text-xs text-muted-foreground/60 font-mono">#{d.id}</span>
                          <span className="text-sm text-foreground">{d.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-[10px]", statusStyles[d.status] || statusStyles.draft)}>
                            {d.status}
                          </Badge>
                          {d.risk_level && (
                            <Badge variant="outline" className={cn("text-[10px]", riskColors[d.risk_level] || "")}>
                              {d.risk_level}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{d.author}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Delete Decisions"
          message={`Are you sure you want to delete ${batch.selectedCount} decision${batch.selectedCount > 1 ? "s" : ""}? This action cannot be undone.`}
          type="danger"
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => {
            setShowDeleteConfirm(false)
            batch.deleteSelected()
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </div>
    )
  }

  // ─── Edit View ────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setViewMode("list")} className="text-muted-foreground">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Decision Editor</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Create and validate advertising decisions with full audit trail
              </p>
            </div>
          </div>
          {editingStatus === "draft" && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-input text-card-foreground"
                onClick={saveDraft}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                size="sm"
                disabled={!allPassed || isSaving}
                onClick={submitForReview}
                className={cn(
                  allPassed && !isSaving
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-input text-muted-foreground cursor-not-allowed"
                )}
              >
                Submit for Review
              </Button>
            </div>
          )}
        </div>

        {/* Validation Status Bar */}
        <Card className="bg-card border-border">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Validation ({passedCount}/{validationItems.length})
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  allPassed
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                )}
              >
                {allPassed ? "Ready" : "Incomplete"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {validationItems.map((item) => (
                <div
                  key={item.key}
                  className={cn(
                    "flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full",
                    item.passed
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.passed ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <span className="w-3 h-3 rounded-full border border-input inline-block" />
                  )}
                  {item.label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Title & Priority */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-card-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Decision Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter decision title..."
                className="bg-muted border-input text-foreground placeholder:text-muted-foreground/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Priority</Label>
              <div className="flex gap-2">
                {(["low", "medium", "high", "critical"] as const).map((level) => (
                  <Button
                    key={level}
                    variant="outline"
                    size="sm"
                    onClick={() => setPriority(level)}
                    className={cn(
                      "capitalize border-input",
                      priority === level
                        ? level === "critical"
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : level === "high"
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          : level === "medium"
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "text-muted-foreground"
                    )}
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Context Summary */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-card-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              Context Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Describe the situation and background context..."
              rows={4}
              className="bg-muted border-input text-foreground placeholder:text-muted-foreground/60"
            />
          </CardContent>
        </Card>

        {/* Input Signals */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-card-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Input Signals
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewSignal(true)}
                className="h-7 text-xs text-blue-400 hover:text-blue-300"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Signal
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {signals.length === 0 && !showNewSignal && (
              <p className="text-sm text-muted-foreground text-center py-4">No signals added yet</p>
            )}
            {signals.map((signal) => {
              const Icon = signalIcons[signal.type]
              return (
                <div
                  key={signal.id}
                  className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-input/50 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-card-foreground">{signal.label}</p>
                  </div>
                  <span className="text-sm font-medium text-foreground">{signal.value}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-card-foreground"
                    onClick={() => removeSignal(signal.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )
            })}

            {/* New Signal Form */}
            {showNewSignal && (
              <div className="rounded-lg border border-input bg-muted/30 p-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newSignalLabel}
                    onChange={(e) => setNewSignalLabel(e.target.value)}
                    placeholder="Signal name"
                    className="flex-1 bg-muted border-input text-foreground placeholder:text-muted-foreground/60 h-8 text-sm"
                  />
                  <Input
                    value={newSignalValue}
                    onChange={(e) => setNewSignalValue(e.target.value)}
                    placeholder="Value"
                    className="w-40 bg-muted border-input text-foreground placeholder:text-muted-foreground/60 h-8 text-sm"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setShowNewSignal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={addSignal}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reasoning */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-card-foreground flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Reasoning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Explain the reasoning behind this decision..."
              rows={4}
              className="bg-muted border-input text-foreground placeholder:text-muted-foreground/60"
            />
          </CardContent>
        </Card>

        {/* Options */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-card-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Options & Recommendation
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewOption(true)}
                className="h-7 text-xs text-blue-400 hover:text-blue-300"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Option
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {options.length === 0 && !showNewOption && (
              <p className="text-sm text-muted-foreground text-center py-4">No options added yet</p>
            )}
            <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
              {options.map((option) => (
                <div
                  key={option.id}
                  className={cn(
                    "rounded-lg border p-4 transition-colors cursor-pointer",
                    selectedOption === option.id
                      ? "border-blue-500/50 bg-blue-500/5"
                      : "border-input bg-muted/30 hover:border-input"
                  )}
                  onClick={() => setSelectedOption(option.id)}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={option.id} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{option.title}</p>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", riskColors[option.riskLevel])}
                        >
                          {option.riskLevel === "low" ? "Low Risk" : option.riskLevel === "medium" ? "Med Risk" : "High Risk"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 ml-auto text-muted-foreground hover:text-card-foreground"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeOption(option.id)
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                      <Separator className="my-2 bg-input" />
                      <div className="flex items-center gap-1 text-xs">
                        <TrendingUp className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Expected Impact:</span>
                        <span className="text-card-foreground">{option.expectedImpact}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {/* New Option Form */}
            {showNewOption && (
              <div className="rounded-lg border border-input bg-muted/30 p-4 space-y-3">
                <div className="space-y-2">
                  <Input
                    value={newOptionTitle}
                    onChange={(e) => setNewOptionTitle(e.target.value)}
                    placeholder="Option title"
                    className="bg-muted border-input text-foreground placeholder:text-muted-foreground/60 h-8 text-sm"
                  />
                  <Textarea
                    value={newOptionDesc}
                    onChange={(e) => setNewOptionDesc(e.target.value)}
                    placeholder="Description..."
                    rows={2}
                    className="bg-muted border-input text-foreground placeholder:text-muted-foreground/60 text-sm"
                  />
                  <Input
                    value={newOptionImpact}
                    onChange={(e) => setNewOptionImpact(e.target.value)}
                    placeholder="Expected impact"
                    className="bg-muted border-input text-foreground placeholder:text-muted-foreground/60 h-8 text-sm"
                  />
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Risk Level</Label>
                    <div className="flex gap-2">
                      {(["low", "medium", "high"] as const).map((level) => (
                        <Button
                          key={level}
                          variant="outline"
                          size="sm"
                          onClick={() => setNewOptionRisk(level)}
                          className={cn(
                            "capitalize text-xs h-7 border-input",
                            newOptionRisk === level
                              ? riskColors[level]
                              : "text-muted-foreground"
                          )}
                        >
                          {level}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setShowNewOption(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={addOption}
                  >
                    Add Option
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
