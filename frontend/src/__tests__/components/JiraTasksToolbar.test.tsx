import React from "react";
import { render, screen } from "@testing-library/react";
import JiraTasksView from "@/components/jira-ticket/JiraTasksView";

describe("JiraTasksView toolbar slots", () => {
  it("renders rightOfSearch between search and view buttons", () => {
    render(
      <JiraTasksView
        tasks={[]}
        viewMode="list"
        onViewModeChange={() => {}}
        searchPlaceholder="Search tasks..."
        rightOfSearch={<div data-testid="right-of-search">FilterSlot</div>}
      />,
    );

    expect(screen.getByPlaceholderText("Search tasks...")).toBeInTheDocument();
    expect(screen.getByTestId("right-of-search")).toBeInTheDocument();
    expect(screen.getByText("List View")).toBeInTheDocument();
  });
});

