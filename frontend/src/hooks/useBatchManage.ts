"use client"

import { useState, useCallback, useMemo } from "react"

interface UseBatchManageOptions {
  items: { id: string | number }[]
  deleteFn: (id: string | number) => Promise<void>
  onDeleteComplete: (deletedIds: (string | number)[]) => void
}

export function useBatchManage({ items, deleteFn, onDeleteComplete }: UseBatchManageOptions) {
  const [isManaging, setIsManaging] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set())
  const [exitingIds, setExitingIds] = useState<Set<string | number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  const enterManageMode = useCallback(() => setIsManaging(true), [])

  const exitManageMode = useCallback(() => {
    setIsManaging(false)
    setSelectedIds(new Set())
  }, [])

  const toggleSelect = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((i) => i.id)))
  }, [items])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isAllSelected = useMemo(
    () => items.length > 0 && selectedIds.size === items.length,
    [items.length, selectedIds.size]
  )

  const isIndeterminate = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < items.length,
    [selectedIds.size, items.length]
  )

  const selectedCount = selectedIds.size

  const isExiting = useCallback(
    (id: string | number) => exitingIds.has(id),
    [exitingIds]
  )

  const deleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return
    setIsDeleting(true)

    const ids = Array.from(selectedIds)

    // 1. Trigger CSS exit animation
    setExitingIds(new Set(ids))

    // 2. Wait for animation
    await new Promise((r) => setTimeout(r, 300))

    // 3. Call delete API for each
    const results = await Promise.allSettled(ids.map((id) => deleteFn(id)))

    // 4. Collect succeeded
    const succeededIds: (string | number)[] = []
    results.forEach((result, i) => {
      if (result.status === "fulfilled") succeededIds.push(ids[i])
    })

    // 5. Notify parent
    if (succeededIds.length > 0) {
      onDeleteComplete(succeededIds)
    }

    // 6. Cleanup
    setExitingIds(new Set())
    setSelectedIds(new Set())
    setIsDeleting(false)
  }, [selectedIds, deleteFn, onDeleteComplete])

  return {
    isManaging,
    enterManageMode,
    exitManageMode,
    selectedIds,
    toggleSelect,
    selectAll,
    deselectAll,
    isAllSelected,
    isIndeterminate,
    selectedCount,
    exitingIds,
    isExiting,
    isDeleting,
    deleteSelected,
  }
}
