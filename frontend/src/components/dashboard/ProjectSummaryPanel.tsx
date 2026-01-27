"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardAPI } from "@/lib/api/dashboardApi";
import type { ActivityEvent, DashboardSummary } from "@/types/dashboard";

type ProjectSummaryPanelProps = {
  projectId?: number | null;
  projectName?: string | null;
  taskId?: number | null;
  showViewAllLink?: boolean;
};

const activityLabels: Record<ActivityEvent["event_type"], string> = {
  task_created: "Created",
  approved: "Approved",
  rejected: "Rejected",
  commented: "Commented",
  task_updated: "Updated",
};

const formatActivityTitle = (activity: ActivityEvent) => {
  const label = activityLabels[activity.event_type] || "Updated";
  const summary = activity.task?.summary || activity.task?.key || "Task";
  return `${label}: ${summary}`;
};

const priorityStyles: Record<string, string> = {
  HIGHEST: "bg-rose-100 text-rose-700 border-rose-200",
  HIGH: "bg-orange-100 text-orange-700 border-orange-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  LOW: "bg-emerald-100 text-emerald-700 border-emerald-200",
  LOWEST: "bg-slate-100 text-slate-600 border-slate-200",
};

const activityStyles: Record<ActivityEvent["event_type"], string> = {
  task_created: "bg-indigo-50/40 text-slate-700 border-indigo-100/70",
  approved: "bg-emerald-50/40 text-slate-700 border-emerald-100/70",
  rejected: "bg-rose-50/40 text-slate-700 border-rose-100/70",
  commented: "bg-sky-50/40 text-slate-700 border-sky-100/70",
  task_updated: "bg-amber-50/40 text-slate-700 border-amber-100/70",
};

const tintByIndex = [
  "bg-indigo-50 text-indigo-700 border-indigo-200",
  "bg-sky-50 text-sky-700 border-sky-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-amber-50 text-amber-700 border-amber-200",
  "bg-rose-50 text-rose-700 border-rose-200",
  "bg-violet-50 text-violet-700 border-violet-200",
];

const pickTint = (index: number) => tintByIndex[index % tintByIndex.length];

export default function ProjectSummaryPanel({
  projectId,
  projectName,
  taskId,
  showViewAllLink = true,
}: ProjectSummaryPanelProps) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projectIdValue = useMemo(() => {
    if (!projectId) return null;
    const parsed = Number(projectId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [projectId]);
  const taskIdValue = useMemo(() => {
    if (!taskId) return null;
    const parsed = Number(taskId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [taskId]);

  const fetchSummary = useCallback(async () => {
    if (!projectIdValue) {
      setSummary(null);
      setError("Project summary requires a valid project.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await DashboardAPI.getSummary({
        project_id: projectIdValue,
      });
      if (!response.data) {
        throw new Error("No summary data received.");
      }
      setSummary(response.data);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load project summary.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [projectIdValue]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const metrics = useMemo(() => {
    if (!summary) return [];
    return [
      {
        label: "Total items",
        value: summary.status_overview.total_work_items,
      },
      {
        label: "Created last 7d",
        value: summary.time_metrics.created_last_7_days,
      },
      {
        label: "Updated last 7d",
        value: summary.time_metrics.updated_last_7_days,
      },
      {
        label: "Due soon",
        value: summary.time_metrics.due_soon,
      },
    ];
  }, [summary]);

  return (
    <section className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 -top-24 h-44 w-44 rounded-full bg-indigo-100/70 blur-[60px]" />
        <div className="absolute -left-12 -bottom-20 h-36 w-36 rounded-full bg-sky-100/70 blur-[60px]" />
        <div className="absolute right-24 top-8 h-12 w-12 rounded-full bg-amber-100/80 blur-xl" />
        <div className="absolute left-10 top-16 h-6 w-6 rounded-full bg-emerald-100/90 blur-lg" />
        <div className="absolute left-1/2 bottom-10 h-8 w-8 rounded-full bg-rose-100/80 blur-lg" />
      </div>
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm">
            Summary
            {projectName && <span className="text-indigo-500">•</span>}
            {projectName && <span>{projectName}</span>}
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            Project snapshot
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            A quick glance at workload, priority, and activity.
          </p>
        </div>
        {showViewAllLink && projectIdValue && (
          <Link
            href={
              taskIdValue
                ? `/dashboard?project_id=${projectIdValue}&task_id=${taskIdValue}`
                : `/dashboard?project_id=${projectIdValue}`
            }
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Full summary
          </Link>
        )}
      </div>

      {!projectIdValue && (
        <p className="relative text-xs text-slate-500">
          Select a task with a project to see summary details.
        </p>
      )}

      {projectIdValue && loading && (
        <p className="relative text-xs text-slate-500">
          Loading project summary...
        </p>
      )}

      {projectIdValue && !loading && error && (
        <div className="relative space-y-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
          <p className="text-xs text-red-600">{error}</p>
          <button
            type="button"
            onClick={fetchSummary}
            className="text-xs font-semibold text-red-700 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {projectIdValue && !loading && !error && summary && (
        <div className="relative space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {metrics.map((metric, index) => {
              const accents = [
                "from-indigo-50 to-white text-indigo-700 border-indigo-100",
                "from-emerald-50 to-white text-emerald-700 border-emerald-100",
                "from-amber-50 to-white text-amber-700 border-amber-100",
                "from-rose-50 to-white text-rose-700 border-rose-100",
              ];
              const accent = accents[index % accents.length];
              return (
                <div
                  key={metric.label}
                  className={`rounded-xl border bg-gradient-to-br px-3 py-3 shadow-sm ${accent}`}
                >
                  <p className="text-[11px] text-slate-600">{metric.label}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {metric.value}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Status
              </p>
              <div className="mt-3 space-y-2">
                {summary.status_overview.breakdown.map((item, index) => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between text-sm text-slate-700"
                  >
                    <span>{item.display_name}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${pickTint(
                        index
                      )}`}
                    >
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Priority
              </p>
              <div className="mt-3 space-y-2">
                {summary.priority_breakdown.map((item) => (
                  <div
                    key={item.priority}
                    className="flex items-center justify-between text-sm text-slate-700"
                  >
                    <span>{item.priority}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                        priorityStyles[item.priority] ||
                        "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Types of work
              </p>
              <div className="mt-3 space-y-2">
                {summary.types_of_work.map((item, index) => (
                  <div
                    key={item.type}
                    className="flex items-center justify-between text-sm text-slate-700"
                  >
                    <span>{item.display_name}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${pickTint(
                        index + 1
                      )}`}
                    >
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Recent activity
            </p>
            <div className="mt-3 space-y-3">
              {summary.recent_activity.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className={`rounded-xl border px-4 py-3 text-xs text-slate-700 shadow-sm transition ${
                    activityStyles[activity.event_type] ||
                    "bg-white/90 border-slate-200"
                  }`}
                >
                  <p className="font-semibold text-slate-900">
                    {formatActivityTitle(activity)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {activity.human_readable}
                  </p>
                </div>
              ))}
              {summary.recent_activity.length === 0 && (
                <p className="text-xs text-slate-500">No recent activity.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
