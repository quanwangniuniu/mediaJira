import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TaskFilterPanel } from "@/components/tasks/TaskFilterPanel";
import type { TaskListFilters } from "@/types/task";

describe("TaskFilterPanel", () => {
  const baseFilters: TaskListFilters = {};

  it("shows Filter badge with active count", () => {
    render(
      <TaskFilterPanel
        filters={{ ...baseFilters, status: "DRAFT", priority: "HIGH" }}
        onChange={() => {}}
        onClearAll={() => {}}
      />,
    );

    const button = screen.getByRole("button", { name: /Filter/i });
    fireEvent.click(button);
    // Jira-style trigger now uses numeric badge, not "Filter N" text
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("calls onClearAll when Clear all is clicked", () => {
    const onClearAll = jest.fn();
    render(
      <TaskFilterPanel
        filters={{ ...baseFilters, status: "DRAFT" }}
        onChange={() => {}}
        onClearAll={onClearAll}
      />,
    );

    const button = screen.getByRole("button", { name: /Filter/ });
    fireEvent.click(button);
    fireEvent.click(screen.getByText(/Clear all/));
    expect(onClearAll).toHaveBeenCalled();
  });

  it("shows per-category selected count badges in the left panel", () => {
    render(
      <TaskFilterPanel
        filters={{ ...baseFilters, status: ["DRAFT", "SUBMITTED"] }}
        onChange={() => {}}
        onClearAll={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Filter/i }));
    // Status category should show count=2
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
  });
});

