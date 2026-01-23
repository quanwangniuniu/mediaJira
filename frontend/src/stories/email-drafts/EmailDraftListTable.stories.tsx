import React from "react"
import { AlertTriangle } from "lucide-react"
import { EmailDraftListCard } from "@/components/email-drafts/EmailDraftListCard"

// Story variants for list/table layouts.
// Storybook coverage for table-level list states.
const meta = {
  title: "EmailDrafts/EmailDraftListTable",
  parameters: {
    layout: "padded",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      description: {
        component: "Email drafts list/table states using existing row component.",
      },
    },
  },
  tags: ["autodocs"],
}

export default meta

// Table scaffold matching the page markup.
const TableFrame = ({
  children,
  fixedHeight = false,
  wrapperClassName = "",
}: {
  children: React.ReactNode
  fixedHeight?: boolean
  wrapperClassName?: string
}) => (
  <div
    className={`${fixedHeight ? "max-w-5xl h-[420px] overflow-y-auto" : "max-w-5xl"} ${wrapperClassName}`}
  >
      <table className="w-full text-sm table-fixed">
      <thead className="border-b text-gray-600">
        <tr>
          <th className="w-10 py-1 px-3 text-left">
            <input type="checkbox" className="accent-emerald-600" />
          </th>
          <th className="py-1 px-3 text-left font-medium">Name</th>
          <th className="py-1 px-3 text-left font-medium">Status</th>
          <th className="py-1 px-3 text-left font-medium">Audience</th>
          <th className="py-1 px-3 text-right font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
)

// Baseline data reused across list state stories.
const baseDrafts = [
  {
    id: 1,
    title: "Welcome Email",
    status: "draft",
    date: "2024-01-15T10:00:00Z",
    recipients: 0,
    typeLabel: "Regular email",
  },
  {
    id: 2,
    title: "Launch Update",
    status: "scheduled",
    date: "2024-02-01T08:00:00Z",
    recipients: 1250,
    typeLabel: "Campaign",
  },
  {
    id: 3,
    title: "January Newsletter",
    status: "sent",
    date: "2024-01-12T11:30:00Z",
    recipients: 2500,
    typeLabel: "Newsletter",
  },
]

// Long list data to validate scrolling behavior.
const manyDrafts = Array.from({ length: 14 }, (_, index) => ({
  ...baseDrafts[index % baseDrafts.length],
  id: index + 10,
  title: `Draft ${index + 1} - ${baseDrafts[index % baseDrafts.length].title}`,
  recipients: (index + 1) * 42,
}))

export const ThreeDrafts = {
  render: () => (
    <TableFrame>
      {baseDrafts.map((draft) => (
        <EmailDraftListCard
          key={draft.id}
          title={draft.title}
          status={draft.status}
          typeLabel={draft.typeLabel}
          date={draft.date}
          recipients={draft.recipients}
        />
      ))}
    </TableFrame>
  ),
}

export const Loading = {
  render: () => (
    <TableFrame>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={`loading-${index}`} className="animate-pulse">
          <td className="py-1 px-3">
            <div className="h-4 w-4 rounded border border-gray-200 bg-gray-100" />
          </td>
          <td className="py-1 px-3">
            <div className="h-4 w-40 rounded bg-gray-100" />
            <div className="mt-2 h-3 w-24 rounded bg-gray-100" />
            <div className="mt-2 h-3 w-20 rounded bg-gray-100" />
          </td>
          <td className="py-1 px-3">
            <div className="h-5 w-16 rounded-full bg-gray-100" />
          </td>
          <td className="py-1 px-3">
            <div className="h-4 w-24 rounded bg-gray-100" />
          </td>
          <td className="py-1 px-3 text-right">
            <div className="ml-auto h-8 w-8 rounded-md bg-gray-100" />
          </td>
        </tr>
      ))}
    </TableFrame>
  ),
}

export const ErrorState = {
  render: () => (
    <TableFrame>
      <tr>
        <td colSpan={5} className="p-8">
          <div className="flex items-center justify-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-6 py-5 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            <div className="text-sm font-medium">
              We couldn&apos;t load drafts right now. Please retry in a moment.
            </div>
          </div>
        </td>
      </tr>
    </TableFrame>
  ),
}

export const Empty = {
  render: () => (
    <TableFrame>
      <tr>
        <td colSpan={5} className="p-8 text-center text-gray-500">
          No email drafts found. Click &quot;Create&quot; to create a new one.
        </td>
      </tr>
    </TableFrame>
  ),
}

export const FilteredEmpty = {
  render: () => (
    <TableFrame>
      <tr>
        <td colSpan={5} className="p-8 text-center text-gray-500">
          No email drafts match your search query.
        </td>
      </tr>
    </TableFrame>
  ),
}

export const ManyRows = {
  render: () => (
    <div className="max-w-5xl">
      <style>{`
        .drafts-scroll { scrollbar-width: thin; scrollbar-color: #cbd5f5 #f3f4f6; }
        .drafts-scroll::-webkit-scrollbar { width: 4px; }
        .drafts-scroll::-webkit-scrollbar-track { background: #f3f4f6; }
        .drafts-scroll::-webkit-scrollbar-thumb { background: #cbd5f5; border-radius: 999px; }
      `}</style>
      <TableFrame fixedHeight wrapperClassName="drafts-scroll">
        {manyDrafts.map((draft) => (
          <EmailDraftListCard
            key={draft.id}
            title={draft.title}
            status={draft.status}
            typeLabel={draft.typeLabel}
            date={draft.date}
            recipients={draft.recipients}
          />
        ))}
      </TableFrame>
    </div>
  ),
}
