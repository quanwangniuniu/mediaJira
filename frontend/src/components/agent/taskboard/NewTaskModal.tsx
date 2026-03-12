"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TaskAPI } from "@/lib/api/taskApi"
import { useProjectStore } from "@/lib/projectStore"
import toast from "react-hot-toast"

const taskTypes = [
  { value: "budget", label: "Budget" },
  { value: "asset", label: "Asset" },
  { value: "report", label: "Report" },
  { value: "retrospective", label: "Retrospective" },
  { value: "experiment", label: "Experiment" },
  { value: "execution", label: "Execution" },
  { value: "scaling", label: "Scaling" },
  { value: "alert", label: "Alert" },
  { value: "optimization", label: "Optimization" },
  { value: "communication", label: "Communication" },
  { value: "platform_policy_update", label: "Policy Update" },
]

const priorities = [
  { value: "HIGHEST", label: "Highest" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
  { value: "LOWEST", label: "Lowest" },
]

interface NewTaskModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function NewTaskModal({ open, onClose, onCreated }: NewTaskModalProps) {
  const activeProject = useProjectStore((s) => s.activeProject)
  const [summary, setSummary] = useState("")
  const [type, setType] = useState("execution")
  const [priority, setPriority] = useState("MEDIUM")
  const [dueDate, setDueDate] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const resetForm = () => {
    setSummary("")
    setType("execution")
    setPriority("MEDIUM")
    setDueDate("")
    setDescription("")
  }

  const handleSubmit = async () => {
    if (!summary.trim()) {
      toast.error("Summary is required")
      return
    }
    if (!activeProject?.id) {
      toast.error("No active project selected")
      return
    }

    setSubmitting(true)
    try {
      await TaskAPI.createTask({
        project_id: activeProject.id,
        type,
        summary: summary.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate || undefined,
      })
      toast.success("Task created")
      resetForm()
      onClose()
      onCreated()
      window.dispatchEvent(new CustomEvent("agent:tasks-changed"))
    } catch {
      toast.error("Failed to create task")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { resetForm(); onClose() } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
          <DialogDescription className="sr-only">Create a new task</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="new-task-summary" className="text-sm font-medium">Summary</label>
            <Input
              id="new-task-summary"
              className="mt-1"
              placeholder="Task summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-task-type" className="text-sm font-medium">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="new-task-type" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="new-task-priority" className="text-sm font-medium">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="new-task-priority" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label htmlFor="new-task-due-date" className="text-sm font-medium">Due Date</label>
            <Input
              id="new-task-due-date"
              className="mt-1"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="new-task-description" className="text-sm font-medium">Description</label>
            <Textarea
              id="new-task-description"
              className="mt-1"
              placeholder="Optional description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onClose() }} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
