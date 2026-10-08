// Next occurrence of periodic deadlines (sales tax, withholding statements), computed from the
// firm's deadline_rules / deadline_overrides rows. No dates are hard-coded here.
import { addDays } from "./dates";

export interface PeriodicRule {
  id: string;
  name: string;
  authority: string | null;
  due_day: number | null;
  month_offset: number | null;
  period_months: number | null;
}

export interface PeriodicOverride {
  rule_id: string;
  period_start: string | null;
  due_date: string;
  reference: string;
}

export interface PeriodicDue {
  rule_id: string;
  name: string;
  authority: string | null;
  period_start: string;
  period_end: string;
  due_date: string;
  reference: string | null;
}

function lastDayOfMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-based
}

/** Periods ending in calendar months aligned to quarters for period_months=3 (Jul-Sep, Oct-Dec, …). */
export function periodicDueDates(rule: PeriodicRule, overrides: PeriodicOverride[], fromIso: string, toIso: string): PeriodicDue[] {
  if (!rule.due_day || rule.period_months == null || rule.month_offset == null) return [];
  const p = rule.period_months;
  const out: PeriodicDue[] = [];
  const [fy, fm] = fromIso.split("-").map(Number);
  // walk period starts from ~13 months before `from` up to `to`
  let y = fy - 1;
  let m = fm;
  for (let i = 0; i < 30; i++) {
    if ((m - 1) % p === 0) {
      const start = `${y}-${String(m).padStart(2, "0")}-01`;
      const endMonthIdx = m + p - 1;
      const ey = y + Math.floor((endMonthIdx - 1) / 12);
      const em = ((endMonthIdx - 1) % 12) + 1;
      const end = `${ey}-${String(em).padStart(2, "0")}-${lastDayOfMonth(ey, em)}`;
      const dueIdx = em + rule.month_offset;
      const dy = ey + Math.floor((dueIdx - 1) / 12);
      const dm = ((dueIdx - 1) % 12) + 1;
      const day = Math.min(rule.due_day, lastDayOfMonth(dy, dm));
      let due = `${dy}-${String(dm).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const ov = overrides.find((o) => o.rule_id === rule.id && o.period_start === start);
      if (ov) due = ov.due_date;
      if (due >= fromIso && due <= toIso) {
        out.push({ rule_id: rule.id, name: rule.name, authority: rule.authority, period_start: start, period_end: end, due_date: due, reference: ov?.reference ?? null });
      }
    }
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

export const withinDays = (today: string, days: number) => addDays(today, days);
