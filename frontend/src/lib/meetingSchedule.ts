/**
 * Helpers for Meeting optional scheduling fields (date / time / external ref).
 * Aligns HTML date/time inputs with Django DateField / TimeField JSON values.
 */

export function meetingDateToInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return String(iso).slice(0, 10);
}

export function meetingTimeToInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const s = String(iso);
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/);
  if (!m) return '';
  const hh = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  return `${hh}:${mm}`;
}

/** <input type="time"> value (HH:MM) → API time string (HH:MM:SS). */
export function normalizeTimeForApi(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
  return v;
}
