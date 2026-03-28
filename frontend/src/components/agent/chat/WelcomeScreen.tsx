"use client"

import { useRef } from "react"
import { Upload } from "lucide-react"
import { ChatInput } from "./ChatInput"

const ACCEPTED_TYPES = ".csv,.xlsx,.xls"

interface WelcomeScreenProps {
  onSend: (message: string) => void
  onFileUpload: (file: File) => void
  disabled?: boolean
}

export function WelcomeScreen({ onSend, onFileUpload, disabled }: WelcomeScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onFileUpload(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            What do you want to analyze today?
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload a CSV or Excel file to start, or type a question below.
          </p>
        </div>

        {/* Primary upload CTA */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleUploadClick}
            disabled={disabled}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            Upload &amp; Analyze
          </button>
          <span className="text-xs text-muted-foreground">
            Supported: CSV, XLSX, XLS (max 10 MB)
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Input */}
        <ChatInput
          onSend={onSend}
          onFileUpload={onFileUpload}
          disabled={disabled}
          placeholder="Or type your question..."
        />
      </div>
    </div>
  )
}
