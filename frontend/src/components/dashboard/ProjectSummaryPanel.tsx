"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardAPI } from "@/lib/api/dashboardApi";
import type { ActivityEvent, DashboardSummary } from "@/types/dashboard";

type ProjectSummaryPanelProps = {
  projectId?: number | null;
  projectName?: string | null;
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

export default function ProjectSummaryPanel({
  projectId,
  projectName,
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
    <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Project Summary
          </h3>
          {projectName && (
            <p className="text-xs text-gray-500 mt-1">{projectName}</p>
          )}
        </div>
        {showViewAllLink && projectIdValue && (
          <Link
            href={`/dashboard?project_id=${projectIdValue}`}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Full summary
          </Link>
        )}
      </div>

      {!projectIdValue && (
        <p className="text-xs text-gray-500">
          Select a task with a project to see summary details.
        </p>
      )}

      {projectIdValue && loading && (
        <p className="text-xs text-gray-500">Loading project summary...</p>
      )}

      {projectIdValue && !loading && error && (
        <div className="space-y-2">
          <p className="text-xs text-red-600">{error}</p>
          <button
            type="button"
            onClick={fetchSummary}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {projectIdValue && !loading && !error && summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="border border-gray-200 rounded-md px-2 py-2"
              >
                <p className="text-[11px] text-gray-500">{metric.label}</p>
                <p className="text-base font-semibold text-gray-900">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
              Status
            </p>
            <div className="mt-2 space-y-1">
              {summary.status_overview.breakdown.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between text-sm text-gray-700"
                >
                  <span>{item.display_name}</span>
                  <span className="font-medium text-gray-900">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
              Priority
            </p>
            <div className="mt-2 space-y-1">
              {summary.priority_breakdown.map((item) => (
                <div
                  key={item.priority}
                  className="flex items-center justify-between text-sm text-gray-700"
                >
                  <span>{item.priority}</span>
                  <span className="font-medium text-gray-900">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
              Types of work
            </p>
            <div className="mt-2 space-y-1">
              {summary.types_of_work.map((item) => (
                <div
                  key={item.type}
                  className="flex items-center justify-between text-sm text-gray-700"
                >
                  <span>{item.display_name}</span>
                  <span className="font-medium text-gray-900">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
              Recent activity
            </p>
            <div className="mt-2 space-y-2">
              {summary.recent_activity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="text-xs text-gray-700">
                  <p className="font-medium text-gray-900">
                    {formatActivityTitle(activity)}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {activity.human_readable}
                  </p>
                </div>
              ))}
              {summary.recent_activity.length === 0 && (
                <p className="text-xs text-gray-500">No recent activity.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
