/**
 * Human-readable errors for meetings API calls (axios-style errors).
 */

function detailToString(detail: unknown): string | null {
  if (detail == null) return null;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    try {
      return detail.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
    } catch {
      return null;
    }
  }
  if (typeof detail === 'object') {
    try {
      return JSON.stringify(detail);
    } catch {
      return null;
    }
  }
  return String(detail);
}

/**
 * Maps HTTP status + DRF body to a clear message for toast / inline error.
 */
export function formatMeetingsApiError(err: unknown, fallback: string): string {
  const e = err as {
    response?: {
      status?: number;
      data?: { detail?: unknown; error?: unknown };
    };
    message?: string;
  };

  const status = e.response?.status;
  const data = e.response?.data;

  if (status === 404) {
    const d = detailToString(data?.detail);
    if (d && d !== 'Not found.' && d !== 'Not found') {
      return `${d} (404)`;
    }
    return (
      'Nothing was found at this URL (404). Usually this means the project does not exist in the ' +
      'database your API uses, or the browser is not talking to Django (wrong host/port, missing ' +
      'nginx proxy, or NEXT_PUBLIC_API_URL). Open Projects, pick a real project, and use Meetings from there.'
    );
  }

  if (status === 403) {
    const d = detailToString(data?.detail);
    if (d) return d;
    return (
      'You do not have permission for this project or meetings. ' +
      'If you opened /projects/{id}/meetings directly, confirm you are a project member.'
    );
  }

  if (status === 400) {
    const d = detailToString(data?.detail);
    if (d) return d;
    if (data?.error != null) return String(data.error);
  }

  if (data?.error != null) return String(data.error);
  const d = detailToString(data?.detail);
  if (d) return d;

  return String(e.message || fallback);
}
