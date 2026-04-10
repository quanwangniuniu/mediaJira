/**
 * Tasks workspace UI lives at `/tasks` (see `app/tasks/page.js`).
 * Keep `create` + `origin_meeting_id` in the URL until the user finishes or cancels create
 * so origin is recoverable from a single place (URL + mirrored form state).
 */
export function taskWorkspaceCreateFromMeetingHref(
  projectId: number,
  meetingId: number,
): string {
  const p = new URLSearchParams();
  p.set("project_id", String(projectId));
  p.set("view", "timeline");
  p.set("create", "1");
  p.set("origin_meeting_id", String(meetingId));
  return `/tasks?${p.toString()}`;
}
