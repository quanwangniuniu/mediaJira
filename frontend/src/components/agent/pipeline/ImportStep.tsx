"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Upload, FileSpreadsheet } from "lucide-react"
import { cn } from "@/lib/utils"

/* ---------- File Upload Zone ---------- */

function FileUploadZone({
  selectedFile,
  onFileSelect,
}: {
  selectedFile: File | null
  onFileSelect: (file: File | null) => void
}) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file && file.name.endsWith(".csv")) {
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFileSelect(file)
    },
    [onFileSelect]
  )

  return (
    <div
      className={cn(
        "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all",
        isDragging && "border-primary bg-primary/5",
        selectedFile && "border-success bg-success/5",
        !isDragging &&
          !selectedFile &&
          "border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/30"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById("pipeline-file-input")?.click()}
    >
      <input
        id="pipeline-file-input"
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileInput}
      />

      {selectedFile ? (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/20">
            <FileSpreadsheet className="h-7 w-7 text-success" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-foreground">
              {selectedFile.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onFileSelect(null)
            }}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Choose another file
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
              isDragging ? "bg-primary/20" : "bg-muted"
            )}
          >
            <Upload
              className={cn(
                "h-7 w-7 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-foreground">
              Drag & drop a CSV file here, or click to browse
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Supports ad performance reports and campaign data in CSV format
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Import Step ---------- */

interface ImportStepProps {
  selectedFile: File | null
  onFileSelect: (file: File | null) => void
  onNext: () => void
  isUploading?: boolean
}

export function ImportStep({
  selectedFile,
  onFileSelect,
  onNext,
  isUploading,
}: ImportStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Import Data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your ad performance CSV file. The AI will automatically analyze
          and identify anomalies.
        </p>
      </div>

      <FileUploadZone
        selectedFile={selectedFile}
        onFileSelect={onFileSelect}
      />

      <div className="flex justify-end pt-4">
        <Button
          onClick={onNext}
          disabled={!selectedFile || isUploading}
          className="gap-2"
        >
          {isUploading ? "Uploading..." : "Next"}
          {!isUploading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
