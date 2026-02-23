import React from "react"
import { MoreHorizontal, Share2 } from "lucide-react"
import { expect, within } from "@storybook/test"
import JiraTicketKey from "../components/jira-ticket/JiraTicketKey"
import JiraTicketSummary from "../components/jira-ticket/JiraTicketSummary"
import JiraTicketTypeIcon from "../components/jira-ticket/JiraTicketTypeIcon"
import TicketDetailContent from "../components/jira-ticket/TicketDetailContent"
import TicketDetailHeader from "../components/jira-ticket/TicketDetailHeader"
import TicketDetailLayout from "../components/jira-ticket/TicketDetailLayout"
import TicketDetailSidebar from "../components/jira-ticket/TicketDetailSidebar"

const meta = {
    title: "Ticket Detail",
    parameters: {
        layout: "fullscreen",
        chromatic: {
            disableSnapshot: false,
            viewports: [360, 768, 1200],
        },
        docs: {
            description: {
                component:
                    "Storybook-first Jira ticket detail layout pieces: header, content, sidebar, and the composed layout.",
            },
        },
    },
    tags: ["autodocs"],
}
export default meta

// Shared wrapper to mimic app page spacing in stories.
const StoryShell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-slate-50 p-6">{children}</div>
)

// Mock identity block used across header and layout stories.
const TicketIdentity = () => {
    const [summary, setSummary] = React.useState(
        "Create the ticket detail layout components"
    )

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
                <JiraTicketTypeIcon type="task" />
                <JiraTicketKey jiraTicketKey="SCRUM-42" onClick={() => {}} />
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          In progress
        </span>
            </div>
            <JiraTicketSummary value={summary} onSave={setSummary} />
        </div>
    )
}

// Placeholder action group for the header right slot.
const HeaderActions = () => (
    <div className="flex items-center gap-2">
        <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
            <Share2 className="h-4 w-4" />
            Share
        </button>
        <button
            type="button"
            className="rounded-md border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
            aria-label="More actions"
        >
            <MoreHorizontal className="h-4 w-4" />
        </button>
    </div>
)

const header = (
    <TicketDetailHeader left={<TicketIdentity />} right={<HeaderActions />} />
)
const content = <TicketDetailContent />
const sidebar = <TicketDetailSidebar />

export const Primary = {
    name: "Layout / Default",
    render: () => (
        <TicketDetailLayout header={header} content={content} sidebar={sidebar} />
    ),
}

export const HeaderDefault = {
    name: "Header / Default",
    render: () => (
        <StoryShell>
            <TicketDetailHeader left={<TicketIdentity />} right={<HeaderActions />} />
        </StoryShell>
    ),
}

export const ContentDefault = {
    name: "Content / Default",
    render: () => (
        <StoryShell>
            <div className="max-w-[840px]">
                <TicketDetailContent />
            </div>
        </StoryShell>
    ),
}

export const SidebarDefault = {
    name: "Sidebar / Default",
    parameters: {
        chromatic: {
            viewports: [768, 1200],
        },
    },
    render: () => (
        <StoryShell>
            <div className="max-w-[360px]">
                <TicketDetailSidebar />
            </div>
        </StoryShell>
    ),
    play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        const canvas = within(canvasElement)
        await expect(canvas.getByRole("button", { name: /details/i })).toBeInTheDocument()
        await expect(canvas.getByText("Assignee")).toBeInTheDocument()
        await expect(canvas.getByText("Reporter")).toBeInTheDocument()
    },
}

export const SidebarCollapsed = {
    name: "Sidebar / Collapsed",
    parameters: {
        chromatic: {
            viewports: [768, 1200],
        },
    },
    render: () => (
        <StoryShell>
            <div className="max-w-[360px]">
                <TicketDetailSidebar defaultCollapsed />
            </div>
        </StoryShell>
    ),
    play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        const canvas = within(canvasElement)
        const trigger = canvas.getByRole("button", { name: /details/i })
        await expect(trigger).toHaveAttribute("aria-expanded", "false")
        await expect(canvas.queryByText("Assignee")).not.toBeInTheDocument()
    },
}

export const SidebarVisualRegression = {
    name: "Visual Test / Sidebar States",
    parameters: {
        chromatic: {
            viewports: [768, 1200],
        },
        docs: {
            description: {
                story:
                    "Visual regression baseline for the Jira-like detail sidebar. This story is intended for Storybook + Chromatic visual tests.",
            },
        },
    },
    render: () => (
        <StoryShell>
            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white">
                    <TicketDetailSidebar className="border-l-0" />
                </div>
                <div className="rounded-lg border border-slate-200 bg-white">
                    <TicketDetailSidebar defaultCollapsed className="border-l-0" />
                </div>
            </div>
        </StoryShell>
    ),
    play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
        const canvas = within(canvasElement)
        const detailButtons = canvas.getAllByRole("button", { name: /details/i })
        await expect(detailButtons).toHaveLength(2)
        await expect(canvas.getByText("Assignee")).toBeInTheDocument()
    },
}

export const SidebarResizable = {
    name: "Sidebar / Resizable",
    render: () => (
        <StoryShell>
            <div className="flex min-h-[420px] rounded-lg border border-slate-200 bg-white">
                <div className="flex-1 border-r border-slate-200 p-6 text-sm text-slate-500">
                    Drag the sidebar handle to resize the Jira ticket details panel.
                </div>
                <TicketDetailSidebar />
            </div>
        </StoryShell>
    ),
}
