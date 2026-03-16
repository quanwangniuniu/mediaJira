import { useMemo, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TaskListFilters } from "@/types/task";

/**
 * Hook to keep task filters in sync with URL query params.
 *
 * URL shape (examples):
 * - ?project_id=123&type=asset&status=UNDER_REVIEW
 * - ?priority=HIGH&current_approver_id=42&has_parent=true
 */
export const useTaskFilterParams = (): [TaskListFilters, (next: TaskListFilters) => void, () => void] => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: TaskListFilters = useMemo(() => {
    const getNumber = (key: string): number | undefined => {
      const raw = searchParams.get(key);
      if (!raw) return undefined;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const getBoolean = (key: string): boolean | undefined => {
      const raw = searchParams.get(key);
      if (!raw) return undefined;
      if (raw.toLowerCase() === "true") return true;
      if (raw.toLowerCase() === "false") return false;
      return undefined;
    };

    const getString = (key: string): string | undefined => {
      const raw = searchParams.get(key);
      return raw || undefined;
    };

    return {
      project_id: getNumber("project_id"),
      type: getString("type"),
      status: getString("status"),
      priority: getString("priority"),
      owner_id: getNumber("owner_id"),
      current_approver_id: getNumber("current_approver_id"),
      has_parent: getBoolean("has_parent"),
      due_date_after: getString("due_date_after"),
      due_date_before: getString("due_date_before"),
      created_after: getString("created_after"),
      created_before: getString("created_before"),
      include_subtasks: getBoolean("include_subtasks"),
      all_projects: getBoolean("all_projects"),
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (next: TaskListFilters) => {
      const params = new URLSearchParams(searchParams.toString());

      const setNumber = (key: keyof TaskListFilters, value?: number) => {
        const k = String(key);
        if (value === undefined || value === null || Number.isNaN(value)) {
          params.delete(k);
        } else {
          params.set(k, String(value));
        }
      };

      const setString = (key: keyof TaskListFilters, value?: string) => {
        const k = String(key);
        if (!value) {
          params.delete(k);
        } else {
          params.set(k, value);
        }
      };

      const setBoolean = (key: keyof TaskListFilters, value?: boolean) => {
        const k = String(key);
        if (value === undefined || value === null) {
          params.delete(k);
        } else {
          params.set(k, value ? "true" : "false");
        }
      };

      setNumber("project_id", next.project_id);
      setString("type", next.type);
      setString("status", next.status);
      setString("priority", next.priority);
      setNumber("owner_id", next.owner_id);
      setNumber("current_approver_id", next.current_approver_id);
      setBoolean("has_parent", next.has_parent);
      setString("due_date_after", next.due_date_after);
      setString("due_date_before", next.due_date_before);
      setString("created_after", next.created_after);
      setString("created_before", next.created_before);
      setBoolean("include_subtasks", next.include_subtasks);
      setBoolean("all_projects", next.all_projects);

      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    [
      "project_id",
      "type",
      "status",
      "priority",
      "owner_id",
      "current_approver_id",
      "has_parent",
      "due_date_after",
      "due_date_before",
      "created_after",
      "created_before",
      "include_subtasks",
      "all_projects",
    ].forEach((key) => params.delete(key));

    router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  return [filters, setFilters, clearFilters];
};

