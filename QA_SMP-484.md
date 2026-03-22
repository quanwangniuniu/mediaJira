# QA Checklist — SMP-484: Meeting Preparation Workspace

**Ticket:** SMP-484  
**Branch:** feature/SMP-484  
**Tester:** Heidi  
**Date:** 20/03/2026  
**Build:**  

---

## Summary of Changes

- Added Meeting Preparation Workspace as a new module
- Added project-level meetings page with project selector
- Added meeting detail workspace for schedule/reference updates
- Added participants management in create/detail flows
- Added agenda create/edit/delete/reorder capabilities
- Added artifact linking with Search & Pick (Decision/Task/Spreadsheet)
- Added custom artifact linking via Other (manual type/id)
- Updated scheduled time to single native time input with minute precision
- Unified related action button color with system blue and cleaned helper texts

---

## Pre-conditions

- [x] Project is running locally (`docker compose -f docker-compose.dev.yml up`)
- [x] Logged in as a valid user
- [x] At least one accessible project exists
- [x] Test data exists for Decision, Task, and Spreadsheet in project
- [x] Project has at least 2 active members for participant tests

---

## Test Scenarios

### 1. Meetings list and project context

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1.1 | Open `/projects/{projectId}/meetings` | Meetings page loads successfully | Pass |
| 1.2 | Check top project selector | Selector is visible and current project is selected | Pass |
| 1.3 | Switch selector to another project | URL changes to selected project and meeting list updates | Pass |
| 1.4 | Open a meeting from list | Navigates to `/projects/{projectId}/meetings/{meetingId}` | Pass |
| 1.5 | Check header in detail page | `Project:` displays project name matching first page selection (not raw ID only) | Pass |

---

### 2. Create meeting (core flow)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 2.1 | Fill Title, Meeting Type, Objective and click Create meeting | Meeting is created and appears in list | Pass |
| 2.2 | Fill Scheduled date only and create | Meeting is created with date saved correctly | Pass |
| 2.3 | Fill Scheduled time using single native time input (e.g. `09:17`) and create | Meeting is created and minute-level time is preserved | Pass |
| 2.4 | Fill External reference and create | Value is saved and visible in detail | Pass |
| 2.5 | Keep required fields empty and submit | Submit is blocked and validation/toast is shown | Pass |

---

### 3. Meeting detail schedule/reference updates

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 3.1 | Open meeting detail and change Scheduled date | Save succeeds and refresh keeps value | Pass |
| 3.2 | Change Scheduled time in single time input to `23:59` | Save succeeds and refresh keeps value | Pass |
| 3.3 | Clear Scheduled time and save | Field is cleared successfully | Pass |
| 3.4 | Update External reference and save | Value updates correctly and persists | Pass |

---

### 4. Participants management

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 4.1 | Add participants when creating meeting | Selected members appear as chips/tags | Pass |
| 4.2 | Try selecting same member twice | Duplicate is prevented | Pass |
| 4.3 | Add participant in detail page | Participant is added and list refreshes | Pass |
| 4.4 | Update participant role in detail page | Role saves successfully | Pass |
| 4.5 | Remove participant | Participant is removed successfully | Pass |

---

### 5. Agenda management

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 5.1 | Add agenda item text and click Add | New item appears in list | Pass |
| 5.2 | Edit agenda item text and blur | Auto-save succeeds and keeps latest value | Pass |
| 5.3 | Toggle Priority / focus | Priority state updates and persists | Pass |
| 5.4 | Drag and reorder agenda items | New order is saved and remains after refresh | Pass |
| 5.5 | Delete agenda item | Item is removed from list | Pass |

---

### 6. Artifact linking (new module key flow)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 6.1 | Use Search & Pick to link a Decision | Artifact link is created with correct label | Pass |
| 6.2 | Use Search & Pick to link a Task | Artifact link is created with correct label | Pass |
| 6.3 | Use Search & Pick to link a Spreadsheet | Artifact link is created with correct label | Pass |
| 6.4 | Click `Open in app` on linked artifact | Navigates to correct in-app target page | Pass |
| 6.5 | Link same type + id again | Duplicate is blocked (or clear error shown) | Pass |
| 6.6 | Switch to Other and enter custom type/id, then link | Custom link is created successfully | Pass |
| 6.7 | Click Unlink on existing artifact | Artifact link is removed successfully | Pass |

---

### 7. UI consistency and regression

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 7.1 | Check Add/Create buttons in meetings pages | Buttons use consistent system blue color | Pass |
| 7.2 | Verify removed helper texts | Deprecated helper text is no longer shown | Pass |
| 7.3 | Verify loading/empty/error states | States are readable and do not break flows | Pass |

---

## Notes / Issues Found

| # | Description | Severity | Status |
|---|-------------|----------|--------|
|   |             |          |        |

---

## Sign-off

- [x] All manual test scenarios passed
- [x] Ready for PR

