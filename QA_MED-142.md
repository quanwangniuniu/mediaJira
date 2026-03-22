# QA Checklist — MED-142: Decision Agent Integration

**Ticket:** MED-142
**Branch:** `feature/MED-142-decision-agent-integration`
**Tester:** _______________
**Date:** _______________

---

## Summary of Changes

- Agent can analyze a CSV file uploaded in the chat (via Dify AI workflow)
- Agent auto-creates a Decision draft (with Signals, Options, Reasoning, Context Summary) and returns a **"Go to Decisions →"** button
- Decision Editor pre-fills all AI-generated data (7/7 validation ready)
- User reviews the pre-filled draft and clicks **"Submit for Review"**
- Agent-created decisions are tagged with `created_by_agent=True`
- Backend: `is_selected=True` set on first Option so `validate_can_commit()` passes
- 30 new field-compatibility tests added to `backend/agent/tests.py`

---

## Pre-conditions

- [ ] Project is running locally (`docker compose -f docker-compose.dev.yml up`)
- [ ] Logged in as a valid user with project membership
- [ ] Active project selected
- [ ] At least one Spreadsheet with data exists in the project
- [ ] `.env` has valid `DIFY_API_KEY`

---

## Test Scenarios

### 1. CSV Upload & AI Analysis

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1.1 | Navigate to **Agent** page | Agent chat loads normally | |
| 1.2 | Click **New Dialogue** | New empty chat session starts | |
| 1.3 | Go to Spreadsheet, export data as CSV | CSV file downloaded | |
| 1.4 | Upload the CSV file in the Agent chat | File accepted, Agent begins analysis | |
| 1.5 | Wait for analysis to complete | Agent returns anomaly detection content | |
| 1.6 | Check chat response | Decision draft preview shown (title, options) | |
| 1.7 | Check chat response | Recommended Tasks listed | |
| 1.8 | Check chat buttons | **"Create Decision"** and **"Create All Tasks"** buttons visible | |

---

### 2. Create Decision

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 2.1 | Click **"Create Decision"** | Shows "Creating decision draft..." | |
| 2.2 | Wait for completion | Shows "Created decision draft: `<title>`" | |
| 2.3 | Check title in message | Title is non-empty (not blank) | |
| 2.4 | Check button | **"Go to Decisions →"** button appears | |
| 2.5 | No errors | No timeout, no 500 error, no permission error | |

---

### 3. Decision Editor Pre-fill Verification

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 3.1 | Click **"Go to Decisions →"** | Navigates to Decision Editor | |
| 3.2 | Check **Title** field | Pre-filled with AI-generated title (non-empty) | |
| 3.3 | Check **Priority** field | Pre-filled (Medium or High) | |
| 3.4 | Check **Context Summary** field | Pre-filled with AI-generated text | |
| 3.5 | Check **Signals** section | ≥ 1 signal shown with meaningful display text | |
| 3.6 | Check **Reasoning** field | Pre-filled with AI-generated reasoning | |
| 3.7 | Check **Options** section | ≥ 2 options shown; first option selected (blue circle) | |
| 3.8 | Check Validation bar | Shows **7/7 Ready** (green badge) | |
| 3.9 | Check **"Submit for Review"** button | Button is active (blue, clickable) | |

---

### 4. Submit for Review

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 4.1 | Click **"Submit for Review"** | No permission error (no 403) | |
| 4.2 | Check toast notification | "Decision submitted" success toast appears | |
| 4.3 | Check navigation | Returns to Decision list | |
| 4.4 | Find the decision in the list | Status shows **committed** | |

---

### 5. Backend Tests

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 5.1 | Run `docker compose exec backend python -m pytest agent/tests.py -v` | All 46 tests pass, 0 failures | |
| 5.2 | Run `docker compose exec backend python -m pytest agent/tests.py::DecisionFieldCompatibilityTests -v` | All 30 field-compatibility tests pass | |
| 5.3 | Run `docker compose exec backend python -m pytest decision/ -v` | All decision tests pass | |

---

### 6. Regression Tests

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 6.1 | Manually create a new Decision ("+ New Decision") | Draft created, saves correctly | |
| 6.2 | Edit and save an existing Decision draft | Saves without error | |
| 6.3 | Open an existing committed Decision | Loads correctly, no errors | |
| 6.4 | Navigate to Spreadsheet page | Page loads without 500 error | |
| 6.5 | Send a calendar-related message to Agent | Calendar feature responds normally | |
| 6.6 | Navigate to `/agent` directly | Agent chat page loads normally | |

---

## Issues Found

| # | Description | Severity | Status |
|---|-------------|----------|--------|
| | | | |

---

## Sign-off

- [ ] All test scenarios passed
- [ ] Decision Editor pre-fills all 7 fields from AI analysis
- [ ] Submit for Review transitions decision to `committed`
- [ ] All 46 backend tests passing
- [ ] No regression in existing functionality
- [ ] Ready for PR
