# SMP-484: When to add meeting participants (PO decision item #6)

## Background

- **PDF specification:** Participants appear under "required attributes," which is often read as requiring them **when the meeting is created**.
- **Current product behavior:** Users create a meeting first (title, type, objective, etc.), then add participants in the **Meeting Preparation Workspace**.

## Acceptance criteria — PO must choose one

The Product Owner should select one option below (or describe a variant) so engineering and QA share the same definition of done.

| Option | Description | Implementation impact |
|--------|-------------|------------------------|
| **A. Add after creation (current default)** | Allow creating a meeting with no participants; add them later in the meeting workspace. | Default config: `MEETINGS_REQUIRE_PARTICIPANTS_AT_CREATE=false`. UI copy: add participants on the meeting page after creation. |
| **B. At least one participant at creation** | Creating a meeting requires at least one **active project member** as a participant. | Set `MEETINGS_REQUIRE_PARTICIPANTS_AT_CREATE=true` (backend) and `NEXT_PUBLIC_MEETINGS_REQUIRE_PARTICIPANTS_AT_CREATE=true` (frontend). The create form must collect participants; combine with in-project user search (task #2) for better UX. |

## Technical notes (already implemented)

- **Create meeting API:** `POST /api/v1/projects/{project_id}/meetings/` accepts an optional field **`participant_user_ids`** (array of integers = user primary keys).
- Only **active members of the current project** (`ProjectMember.is_active`) may be added. Invalid IDs or non-members return **400**.
- Whether **at least one** participant is required is controlled by **`MEETINGS_REQUIRE_PARTICIPANTS_AT_CREATE`** (default `false`).

## PO sign-off

- **Selected option:** A / B / Other: ________________
- **Name:** ________________
- **Date:** ________________

---

*Jira: SMP-484 / item #6.*
