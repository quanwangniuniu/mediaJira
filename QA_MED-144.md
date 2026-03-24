# QA Checklist — MED-144: Calendar ↔ Agent Integration

**Branch:** `feature/MED-144-calendar-agent-integration`
**Date:** 2026-03-24
**Tested by:** DCDD

---

## Feature Overview

Adds "Ask Agent" entry points on the Calendar page (toolbar + event panel). The AI Agent receives real calendar event data, answers scheduling questions using the user's local timezone, can create new calendar events on the user's behalf, and auto-refreshes the calendar after event creation.

---

## Test Environment

- Browser: Chrome / Safari
- Timezone: Australia/Melbourne (AEDT, UTC+11)
- Project: performance launch
- Calendar: performance launch Calendar

---

## 1. Calendar Toolbar — Ask Agent Button

| # | Test Case | Expected Result | Pass/Fail |
|---|-----------|-----------------|-----------|
| 1.1 | Open `/calendar` page in Week view. Verify "Ask Agent" button appears in the toolbar (right side, purple, with sparkle icon). | Button is visible and styled correctly. | ✅ |
| 1.2 | Click "Ask Agent" button. | Navigates to `/agent` page. Auto-sends message: "I'm viewing my calendar (week view). Can you help me..." | ✅ |
| 1.3 | Agent responds with current week's events listed in **local time (AEDT)**, not UTC. | Event times are correct local time, e.g. "7:00 AM" not "8:00 PM". | ✅ |
| 1.4 | Repeat from Month view. | Auto-sent message says "month view". Agent lists current month's events. | ✅ |
| 1.5 | Repeat from Day view. | Auto-sent message says "day view". Agent lists that day's events only. | ✅ |

---

## 2. Event Panel — Ask Agent Button

| # | Test Case | Expected Result | Pass/Fail |
|---|-----------|-----------------|-----------|
| 2.1 | Click any event on the calendar to open the event detail panel. Verify "Ask Agent about this event" button appears at the bottom of the panel. | Button is visible. | ✅ |
| 2.2 | Click "Ask Agent about this event". | Navigates to `/agent`. Auto-sends message with event title, date, time, and description. | ✅ |
| 2.3 | Agent response correctly identifies the event name, date (local timezone), and offers preparation suggestions. | Response is accurate and uses local time. | ✅ |

---

## 3. Calendar Context — Follow-up Conversations

| # | Test Case | Expected Result | Pass/Fail |
|---|-----------|-----------------|-----------|
| 3.1 | After the initial calendar question is answered, send a follow-up: "What about next week?" | Agent answers with next week's events (not a generic/error response). | ✅ |
| 3.2 | Send another follow-up: "Do I have anything on Wednesday?" | Agent correctly references calendar data, does not fall back to "I can help you analyze spreadsheet data...". | ✅ |
| 3.3 | Refresh the `/agent` page while in a calendar session. Send a new message. | Calendar context is preserved after refresh; Agent still responds with calendar data. | ✅ |

---

## 4. Agent Creates Calendar Events

| # | Test Case | Expected Result | Pass/Fail |
|---|-----------|-----------------|-----------|
| 4.1 | Ask Agent: "Please create a meeting called 'Team meeting' on March 31st at 1pm". | Agent replies confirming the event. Shows "✅ 1 calendar event created successfully." No ⚠️ warning. | ✅ |
| 4.2 | Go to `/calendar` and navigate to March 31. | "Team meeting" event appears at **1:00 PM – 2:00 PM** local time (not 2:00 AM or other wrong time). | ✅ |
| 4.3 | Click the created event to verify details. | Title: "Team meeting", Time: 1:00 PM – 2:00 PM, Calendar: performance launch Calendar. | ✅ |
| 4.4 | Delete the event, then ask Agent to create it again in the same session. | Agent creates it successfully again. Only "✅ 1 calendar event created successfully." — no duplicate warning. | ✅ |
| 4.5 | Ask Agent to create an event without specifying end time, e.g. "Create a call on April 2nd at 3pm". | Agent creates a 1-hour event (3:00 PM – 4:00 PM) by default. | ✅ |

---

## 5. Calendar Auto-Refresh After Event Creation

| # | Test Case | Expected Result | Pass/Fail |
|---|-----------|-----------------|-----------|
| 5.1 | On `/calendar`, click "Ask Agent". On `/agent`, ask Agent to create an event. Then navigate back to `/calendar`. | New event appears in the calendar **without manually refreshing the page**. | |
| 5.2 | On `/calendar`, click "Ask Agent". On `/agent`, create an event. Then click the browser **Back button** to return to `/calendar`. | New event appears without manual refresh (bfcache restore handled). | |
| 5.3 | Open `/calendar` in Tab A and `/agent` in Tab B. Create an event in Tab B. Switch to Tab A. | Calendar in Tab A auto-refreshes and shows the new event. | |

---

## 6. Proactive Calendar Invite Prompt

| # | Test Case | Expected Result | Pass/Fail |
|---|-----------|-----------------|-----------|
| 6.1 | Click "Ask Agent" from `/calendar`. After the Agent answers the calendar question, check the chat. | A **violet card** appears below the answer: "Do you need me to create an event for you? If so, please tell me the specific time (down to the hour)." | |
| 6.2 | Ask Agent to create a specific event (e.g. "Create a meeting on April 5th at 2pm"). | The violet invite card does **NOT** appear after the creation confirmation — only the ✅ success message. | |
| 6.3 | After the violet invite card appears, type a reply: "Yes, please create a team sync on April 10th at 3pm." | Agent creates the event and shows ✅ confirmation. | |
| 6.4 | Refresh the `/agent` page after a calendar answer that showed the invite card. | The violet invite card is still visible in the restored chat history. | |

---

## 7. Deleted Events Not Recognized by Agent

| # | Test Case | Expected Result | Pass/Fail |
|---|-----------|-----------------|-----------|
| 7.1 | Delete an event from the calendar. Then ask Agent about the current week's events. | Agent does **not** mention the deleted event. | |
| 7.2 | Delete an event. Ask Agent to list all events for that day. | Deleted event is absent from Agent's response. | |

---

## 8. Timezone Correctness

| # | Test Case | Expected Result | Pass/Fail |
|---|-----------|-----------------|-----------|
| 8.1 | Ask Agent what events are scheduled "today". | Agent reports today's date as local date (e.g. March 24, not March 23). | ✅ |
| 8.2 | Ask Agent to create an event at 10:00 AM on a specific date. | Event appears at 10:00 AM in the calendar (local timezone), not at a UTC-converted time. | ✅ |
| 8.3 | Agent's response references times with the local timezone label (e.g. "Australia/Melbourne" or "AEDT"). | Timezone is correctly identified in responses. | ✅ |

---

## 9. Error & Edge Cases

| # | Test Case | Expected Result | Pass/Fail |
|---|-----------|-----------------|-----------|
| 9.1 | Navigate to `/agent` directly (without clicking Ask Agent from calendar). Send a message. | Agent responds normally with generic agent behavior (not calendar mode). | ✅ |
| 9.2 | Click "New Chat" in the Agent sidebar while in a calendar session. Send a message. | New chat has no calendar context; Agent uses generic mode. | ✅ |
| 9.3 | Ask Agent a calendar question when the calendar has no events in the current week. | Agent responds gracefully: "You have no events this week." or similar. | ✅ |

---

## 10. Regression — Existing Agent Features

| # | Test Case | Expected Result | Pass/Fail |
|---|-----------|-----------------|-----------|
| 10.1 | Upload a CSV file and analyze it. | Existing spreadsheet analysis flow works normally. | ✅ |
| 10.2 | Create a Decision via Agent. | Decision creation flow works normally. | ✅ |
| 10.3 | Use follow-up chat after analysis. | Follow-up chat flow works normally. | ✅ |

---

## Notes

- The "Ask Agent" button on the event panel is only visible in the event **view** mode, not in edit mode.
- Calendar context is scoped to the current session tab. Opening a new browser tab will start a fresh Agent session.
- Auto-refresh covers: same-window navigation, browser back button (bfcache), and cross-tab via localStorage.
