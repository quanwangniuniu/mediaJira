/** Local calendar week: Monday–Sunday (ISO week-style start). */

function mondayOfWeekContaining(d: Date): Date {
  const day = d.getDay(); // 0 Sun … 6 Sat
  const offset = day === 0 ? -6 : 1 - day;
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + offset);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getThisWeekDateRange(): { date_from: string; date_to: string } {
  const mon = mondayOfWeekContaining(new Date());
  const sun = addDays(mon, 6);
  return { date_from: toYmd(mon), date_to: toYmd(sun) };
}

export function getNextWeekDateRange(): { date_from: string; date_to: string } {
  const mon = mondayOfWeekContaining(new Date());
  const nextMon = addDays(mon, 7);
  const nextSun = addDays(nextMon, 6);
  return { date_from: toYmd(nextMon), date_to: toYmd(nextSun) };
}
