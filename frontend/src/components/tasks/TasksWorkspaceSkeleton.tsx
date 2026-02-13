import React from "react";
import {
  JiraBoardColumn,
  JiraBoardColumns,
} from "@/components/jira-ticket/JiraBoard";

type TasksWorkspaceSkeletonProps = {
  mode?: "summary" | "board" | "tasks";
};

const PulseBlock = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />
);

export default function TasksWorkspaceSkeleton({
  mode = "tasks",
}: TasksWorkspaceSkeletonProps) {
  if (mode === "summary") {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`summary-card-${index}`}
              className="rounded-md border border-slate-200 bg-white p-4"
            >
              <PulseBlock className="h-3 w-20" />
              <PulseBlock className="mt-3 h-7 w-16" />
              <PulseBlock className="mt-3 h-2.5 w-24" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <PulseBlock className="h-4 w-32" />
            <PulseBlock className="mt-4 h-44 w-full rounded-lg" />
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <PulseBlock className="h-4 w-28" />
            <PulseBlock className="mt-4 h-44 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (mode === "board") {
    return (
      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <PulseBlock className="h-9 w-[280px] md:w-[340px]" />
            <div className="flex items-center gap-2">
              <PulseBlock className="h-8 w-8 rounded-full" />
              <PulseBlock className="h-8 w-28" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PulseBlock className="h-9 w-24" />
          </div>
        </div>
        <JiraBoardColumns>
          {Array.from({ length: 4 }).map((_, colIndex) => (
            <JiraBoardColumn
              key={`board-skeleton-col-${colIndex}`}
              title=""
              footer={<PulseBlock className="h-8 w-24" />}
            >
              {Array.from({ length: 3 }).map((__, cardIndex) => (
                <div
                  key={`board-skeleton-card-${colIndex}-${cardIndex}`}
                  className="h-[132px] shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2.5"
                >
                  <div className="h-[40px] w-[180px] max-w-full">
                    <PulseBlock className="h-4 w-10/12" />
                    <PulseBlock className="mt-2 h-4 w-7/12" />
                  </div>
                  <div className="mt-2 h-6">
                    <PulseBlock className="h-5 w-28 rounded" />
                  </div>
                  <div className="mt-2 flex h-6 items-center justify-between gap-2">
                    <PulseBlock className="h-3 w-24" />
                    <PulseBlock className="h-6 w-6 rounded-full" />
                  </div>
                </div>
              ))}
            </JiraBoardColumn>
          ))}
          <div className="flex h-[clamp(360px,58vh,560px)] w-[420px] flex-shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm">
            <PulseBlock className="h-8 w-8 rounded-full" />
          </div>
        </JiraBoardColumns>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] px-6 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <PulseBlock className="h-9 w-[300px]" />
          <PulseBlock className="h-9 w-28" />
          <PulseBlock className="h-9 w-32" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <PulseBlock className="h-4 w-24" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 7 }).map((_, index) => (
                <PulseBlock key={`task-list-skeleton-${index}`} className="h-16 w-full" />
              ))}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-5">
            <PulseBlock className="h-4 w-24" />
            <PulseBlock className="mt-4 h-8 w-2/3" />
            <PulseBlock className="mt-6 h-24 w-full rounded-lg" />
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <PulseBlock className="h-20 w-full" />
              <PulseBlock className="h-20 w-full" />
            </div>
            <PulseBlock className="mt-6 h-28 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
