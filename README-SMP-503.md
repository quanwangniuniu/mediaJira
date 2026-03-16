# Feature Demo Video - QA Checklist (Developer Submission)

**Developer Name:** Janice
**Ticket / Issue:** SMP-503
**Environment:** local

## Scope & Intent
**What problem does this feature solve?**
- Show task execution rollup (counts + links) on decision detail page.

**In-scope**
- Decision detail page task rollup summary
- Linked task list with status + due date
- Task link navigation to `/tasks/{id}`

**Out of scope**
- None

## Demo Walkthrough (QA)
1. Open decision list page and enter target decision
2. Verify Tasks panel appears on decision detail page
3. Confirm summary counts match task statuses
4. Click a task to navigate to task detail page
5. Return to decision detail page and confirm UI remains correct

## Evidence / Results
- Summary counts shown (total + status breakdown)
- Linked tasks list rendered correctly
- Task link navigates to task detail

**Result:** PASS
**Not covered (optional):** Approved / Rejected counts


