// Dates are stored as ISO (YYYY-MM-DD) and shown as DD-MM-YYYY. "Today" is Pakistan time.

const PK_TZ = "Asia/Karachi";

export function todayPK(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: PK_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** "2026-09-30" or a timestamp -> "30-09-2026" */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "–";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}-${m}-${y}`;
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "–";
  return formatDate(todayPK(date));
}

/** "30-09-2026 14:05" in Pakistan time */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "–";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "–";
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: PK_TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return `${formatDate(date)} ${time}`;
}

/** Parses DD-MM-YYYY (or ISO) to ISO. Returns null if invalid. */
export function parseDate(input: string): string | null {
  const s = input.trim();
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (match) {
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    return null;
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y.toString().padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** "today", "in 3 days", "5 days overdue" relative to today (PK). */
export function relativeDue(dueIso: string | null | undefined, today: string = todayPK()): string {
  if (!dueIso) return "";
  const n = daysBetween(today, dueIso);
  if (n === 0) return "due today";
  if (n === 1) return "due tomorrow";
  if (n > 1) return `in ${n} days`;
  if (n === -1) return "1 day overdue";
  return `${-n} days overdue`;
}
