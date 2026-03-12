"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Paperclip, Send, X, FileSpreadsheet } from "lucide-react"
import { cn } from "@/lib/utils"

const ACCEPTED_TYPES = ".csv,.xlsx,.xls"
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface ChatInputProps {
  onSend: (message: string) => void
  onFileUpload: (file: File) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, onFileUpload, disabled, placeholder }: ChatInputProps) {
  const [input, setInput] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      setFileError("File too large (max 10MB)")
      return
    }

    setFileError(null)
    setSelectedFile(file)
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFileError(null)
  }

  const handleSubmit = () => {
    if (disabled) return

    if (selectedFile) {
      onFileUpload(selectedFile)
      setSelectedFile(null)
      setInput("")
      return
    }

    if (input.trim()) {
      onSend(input.trim())
      setInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const textarea = e.target
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }

  const canSubmit = !disabled && (input.trim() || selectedFile)

  return (
    <div className="border-t border-border bg-card/50 p-4">
      {/* Selected file chip */}
      {selectedFile && (
        <div className="mb-3 flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted border border-border px-3 py-1.5">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground truncate max-w-[200px]">
              {selectedFile.name}
            </span>
            <span className="text-xs text-muted-foreground">
              ({formatFileSize(selectedFile.size)})
            </span>
            <button onClick={handleRemoveFile} className="ml-1 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {fileError && (
        <p className="mb-2 text-xs text-red-400">{fileError}</p>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        {/* File upload button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
          <span className="sr-only">Attach file</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Ask about your data or upload a file..."}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />

        {/* Send button */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          size="icon"
          className="h-9 w-9 shrink-0"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </div>
  )
}
