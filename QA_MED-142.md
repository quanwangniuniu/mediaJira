# QA Checklist — MED-142: Decision ↔ Agent Integration

**Ticket:** MED-142
**Branch:** feature/MED-142-decision-agent-integration
**Tester:**
**Date:**
**Build:**

---

## Summary of Changes

- Removed **"Ask Agent"** button from Decision detail pages (was redirecting to `/agent` with decision context)
- Added **"Generate from Spreadsheet"** button on the Decisions list page — allows AI to analyze real spreadsheet data and auto-create a Decision with Signals and Options

---

## Pre-conditions

- [ ] Project is running locally (`docker compose -f docker-compose.dev.yml up`)
- [ ] Logged in as a valid user
- [ ] Active project selected
- [ ] At least one Spreadsheet exists in the project (with data — not empty)

---

## Test Scenarios

### 1. "Ask Agent" Button Removed — Decision Detail Page

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1.1 | Navigate to any Decision in **DRAFT** state | Decision editing page loads | |
| 1.2 | Inspect the top header area | **No "Ask Agent" button** is visible anywhere on the page | |
| 1.3 | Navigate to a Decision in **COMMITTED** state | Decision detail page loads | |
| 1.4 | Inspect the top header area | **No "Ask Agent" button** is visible | |
| 1.5 | Navigate to a Decision in **REVIEWED** or **ARCHIVED** state | Decision detail page loads | |
| 1.6 | Inspect the top header area | **No "Ask Agent" button** is visible | |

---

### 2. "Generate from Spreadsheet" Button — Decisions List Page

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 2.1 | Navigate to the **Decisions** list page (`/decisions`) | Decisions list loads | |
| 2.2 | Locate the top-right button area | A purple **"Generate from Spreadsheet"** button (with sparkle icon) is visible next to "Create Decision" | |
| 2.3 | Click **"Generate from Spreadsheet"** | A modal dialog opens titled "Generate Decision from Spreadsheet" | |
| 2.4 | Inspect modal contents | Modal shows a dropdown list of available spreadsheets for the current project | |
| 2.5 | Select a spreadsheet from the dropdown | Spreadsheet is selected (highlighted) | |
| 2.6 | Click **"Generate Decision"** button | Button enters loading state ("Generating…"), spinner shows | |
| 2.7 | Wait for completion (~10–30 seconds) | Success toast: "Decision created!" — modal closes, browser navigates to the newly created Decision detail page | |
| 2.8 | Inspect the generated Decision | Decision has: title, context summary, reasoning, risk level, confidence, at least one Signal (anomaly), at least one Option | |

---

### 3. "Generate from Spreadsheet" — Error Handling

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 3.1 | Click "Generate from Spreadsheet" when project has **no spreadsheets** | Modal opens, dropdown shows empty state or "No spreadsheets available" | |
| 3.2 | Open modal and click "Generate Decision" without selecting a spreadsheet | **Generate button is disabled** (cannot submit without selection) | |
| 3.3 | Close modal by clicking "Cancel" or the X button | Modal closes, no Decision is created | |

---

### 4. "Created by Agent" Badge

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 4.1 | Navigate to a Decision generated via "Generate from Spreadsheet" | Decision detail page loads | |
| 4.2 | Check the status/badge area in the detail view | A violet **"Created by Agent"** badge is displayed next to the status badge | |
| 4.3 | Navigate to a Decision created manually by a user | "Created by Agent" badge is **not** visible | |

---

### 5. Generated Decision — Content Quality

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 5.1 | Open a Decision generated via "Generate from Spreadsheet" | Decision detail loads | |
| 5.2 | Check **Signals** section | At least one Signal (anomaly) is present, referencing a real metric (e.g. ROAS, CTR, CPA) | |
| 5.3 | Check **Options** section | At least one Option is present with meaningful text | |
| 5.4 | Check **Context Summary** and **Reasoning** fields | Fields are populated with AI-generated text relevant to the spreadsheet data (not placeholder/empty) | |
| 5.5 | Check **Risk Level** | Valid value: LOW, MEDIUM, or HIGH | |
| 5.6 | Check **Confidence** | Integer value between 1–5 | |

---

### 6. Regression — Existing Decision Functionality

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 6.1 | Create a new Decision draft manually | Draft created successfully, no errors | |
| 6.2 | Edit and save a Decision draft | Draft saves, "Last saved" time updates | |
| 6.3 | Commit a Decision | Decision transitions to COMMITTED state | |
| 6.4 | Approve a Decision (AWAITING_APPROVAL → COMMITTED) | Approval works correctly | |
| 6.5 | Delete a Decision draft | Decision deleted, redirected to list | |
| 6.6 | View Decision list | All decisions displayed correctly with correct status badges | |
| 6.7 | Navigate to `/agent` page directly | Agent chat page still loads and works normally (no regression) | |

---

### 7. Regression — Backend Tests

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 7.1 | Run `docker compose exec backend python -m pytest decision/ -v` | All decision tests pass, 0 failures | |
| 7.2 | Run `docker compose exec backend python -m pytest agent/ -v` | All agent tests pass, 0 failures | |
| 7.3 | Run `docker compose exec backend python manage.py test` | All tests pass | |

---

## Notes / Issues Found

| # | Description | Severity | Status |
|---|-------------|----------|--------|
|   |             |          |        |

---

## Sign-off

- [ ] All test scenarios passed
- [ ] "Ask Agent" button confirmed absent from all Decision detail states
- [ ] "Generate from Spreadsheet" generates a real AI-powered Decision with Signals and Options
- [ ] No regression in existing functionality
- [ ] Backend tests all passing
- [ ] Ready for PR
