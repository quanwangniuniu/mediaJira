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
    const getNumbers = (key: string): number[] => {
      const values = searchParams.getAll(key);
      return values
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n));
    };

    const getNumber = (key: string): number | undefined => {
      const parsed = getNumbers(key);
      return parsed.length ? parsed[0] : undefined;
    };

    const getStrings = (key: string): string[] => {
      return searchParams.getAll(key).filter(Boolean);
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

    const setString = (key: string, value?: string) => {
      // helper for return object normalization
      return value || undefined;
    };

    return {
      project_id: getNumber("project_id"),
      type: (() => {
        const vals = getStrings("type");
        return vals.length > 1 ? vals : vals[0] || undefined;
      })(),
      status: (() => {
        const vals = getStrings("status");
        return vals.length > 1 ? vals : vals[0] || undefined;
      })(),
      priority: (() => {
        const vals = getStrings("priority");
        return vals.length > 1 ? vals : vals[0] || undefined;
      })(),
      owner_id: (() => {
        const vals = getNumbers("owner_id");
        return vals.length > 1 ? vals : vals[0] || undefined;
      })(),
      current_approver_id: (() => {
        const vals = getNumbers("current_approver_id");
        return vals.length > 1 ? vals : vals[0] || undefined;
      })(),
      has_parent: getBoolean("has_parent"),
      due_date_after: setString("due_date_after", getString("due_date_after")),
      due_date_before: setString("due_date_before", getString("due_date_before")),
      created_after: setString("created_after", getString("created_after")),
      created_before: setString("created_before", getString("created_before")),
      include_subtasks: getBoolean("include_subtasks"),
      all_projects: getBoolean("all_projects"),
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (next: TaskListFilters) => {
      const params = new URLSearchParams(searchParams.toString());

      const setRepeated = (key: keyof TaskListFilters, value?: string | string[] | number | number[]) => {
        const k = String(key);
        params.delete(k);
        if (value === undefined || value === null) return;
        const list = Array.isArray(value) ? value : [value];
        list.forEach((item) => {
          if (item === undefined || item === null) return;
          const str = String(item);
          if (!str) return;
          params.append(k, str);
        });
      };

      const setNumber = (key: keyof TaskListFilters, value?: number) => {
        const k = String(key);
        if (value === undefined || value === null || Number.isNaN(value)) {
          params.delete(k);
        } else {
          params.set(k, String(value));
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

      const setString = (key: keyof TaskListFilters, value?: string) => {
        const k = String(key);
        if (!value) params.delete(k);
        else params.set(k, value);
      };

      setNumber("project_id", next.project_id);
      setRepeated("type", next.type as any);
      setRepeated("status", next.status as any);
      setRepeated("priority", next.priority as any);
      setRepeated("owner_id", next.owner_id as any);
      setRepeated("current_approver_id", next.current_approver_id as any);
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

