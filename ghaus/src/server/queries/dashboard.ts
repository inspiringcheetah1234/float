import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, todayPK } from "@/lib/domain/dates";
import { filingSeasonYear } from "@/lib/domain/tax-year";
import { periodicDueDates, type PeriodicDue } from "@/lib/domain/deadlines";
import { returnRank, type ReturnStatus } from "@/lib/domain/pipeline";
import type { Enums } from "@/types/db";

export interface ReturnLite {
  id: string;
  client_id: string;
  client_name: string;
  client_type: Enums<"client_type">;
  tax_year: number;
  status: ReturnStatus;
  assignee_id: string | null;
  reviewer_id: string | null;
  due: string | null;
  is_filed: boolean;
  wealth_gap: number;
  atl_status: Enums<"atl_status">;
}

const RETURN_COLS =
  "id, client_id, client_name, client_type, tax_year, return_status, assignee_id, reviewer_id, filing_due_date, is_filed, wealth_gap, atl_status";

function toLite(r: Record<string, unknown>): ReturnLite {
  return {
    id: r.id as string,
    client_id: r.client_id as string,
    client_name: r.client_name as string,
    client_type: r.client_type as Enums<"client_type">,
    tax_year: r.tax_year as number,
    status: r.return_status as ReturnStatus,
    assignee_id: r.assignee_id as string | null,
    reviewer_id: r.reviewer_id as string | null,
    due: r.filing_due_date as string | null,
    is_filed: Boolean(r.is_filed),
    wealth_gap: Number(r.wealth_gap ?? 0),
    atl_status: (r.atl_status ?? "unknown") as Enums<"atl_status">,
  };
}

export const isPrepared = (s: ReturnStatus) => returnRank(s) >= returnRank("in_preparation");

export async function getDashboardData(opts: { userId?: string }) {
  const supabase = await createClient();
  const today = todayPK();
  const in30 = addDays(today, 30);
  const in7 = addDays(today, 7);
  const season = filingSeasonYear(today);
  const mine = <T extends { eq: (c: string, v: string) => T }>(q: T, col: string) => (opts.userId ? q.eq(col, opts.userId) : q);

  const [seasonRes, openRes, hearingsRes, noticesRes, tasksRes, rulesRes, overridesRes, firmRes, regsRes, strnRes] = await Promise.all([
    mine(supabase.from("v_client_tax_years").select(RETURN_COLS).eq("tax_year", season) as never, "assignee_id") as unknown as Promise<{ data: Record<string, unknown>[] | null }>,
    // unfiled returns from any year that are overdue or due within 30 days
    mine(supabase.from("v_client_tax_years").select(RETURN_COLS).eq("is_filed", false).lte("filing_due_date", in30) as never, "assignee_id") as unknown as Promise<{ data: Record<string, unknown>[] | null }>,
    (() => {
      let q = supabase.from("hearings").select("id, client_id, hearing_date, hearing_time, forum, appearing_user_id, clients(name)")
        .is("deleted_at", null).gte("hearing_date", today).lte("hearing_date", in7).order("hearing_date");
      if (opts.userId) q = q.eq("appearing_user_id", opts.userId);
      return q;
    })(),
    (() => {
      let q = supabase.from("notices").select("id, client_id, section, reply_due_date, status, assignee_id, clients(name)")
        .is("deleted_at", null).in("status", ["received", "reply_drafted", "under_review"]).lte("reply_due_date", in30).order("reply_due_date");
      if (opts.userId) q = q.eq("assignee_id", opts.userId);
      return q;
    })(),
    (() => {
      let q = supabase.from("tasks").select("id, title, description, assignee_id, due_date, status, auto_rule_id, updated_at, client_id, clients(name), client_tax_years(tax_year)")
        .is("deleted_at", null).in("status", ["open", "in_progress"]).order("due_date", { nullsFirst: false }).limit(200);
      if (opts.userId) q = q.eq("assignee_id", opts.userId);
      return q;
    })(),
    supabase.from("deadline_rules").select("id, name, authority, kind, due_day, month_offset, period_months").is("deleted_at", null).eq("is_active", true).in("kind", ["sales_tax_return", "withholding_statement"]),
    supabase.from("deadline_overrides").select("rule_id, period_start, due_date, reference").is("deleted_at", null).not("period_start", "is", null),
    supabase.from("firms").select("wealth_gap_threshold, atl_surcharge_individual, atl_surcharge_aop, atl_surcharge_company, atl_risk_days").single(),
    supabase.from("client_registrations").select("authority, client_id, clients!inner(is_active, deleted_at)").is("deleted_at", null),
    supabase.from("clients").select("id", { count: "exact", head: true }).not("strn", "is", null).eq("is_active", true).is("deleted_at", null),
  ]);

  const seasonReturns = (seasonRes.data ?? []).map(toLite);
  const upcoming = (openRes.data ?? []).map(toLite).sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
  const firm = firmRes.data!;
  const threshold = Number(firm.wealth_gap_threshold);

  // Statutory periodic deadlines in the next 30 days, with the number of clients they affect
  const regCount = new Map<string, number>();
  for (const r of regsRes.data ?? []) {
    const c = r.clients as unknown as { is_active: boolean; deleted_at: string | null } | null;
    if (c?.is_active && !c.deleted_at) regCount.set(r.authority, (regCount.get(r.authority) ?? 0) + 1);
  }
  const periodic: (PeriodicDue & { clients: number })[] = [];
  for (const rule of rulesRes.data ?? []) {
    for (const d of periodicDueDates(rule, overridesRes.data ?? [], today, in30)) {
      const clients = rule.kind === "sales_tax_return"
        ? rule.authority === "FBR" ? (strnRes.count ?? 0) : (regCount.get(rule.authority ?? "") ?? 0)
        : 0;
      periodic.push({ ...d, clients });
    }
  }
  periodic.sort((a, b) => a.due_date.localeCompare(b.due_date));

  const surcharge = (t: Enums<"client_type">) =>
    Number(t === "company" ? firm.atl_surcharge_company : t === "aop" ? firm.atl_surcharge_aop : firm.atl_surcharge_individual);
  const riskCutoff = addDays(today, Number(firm.atl_risk_days));
  const atlRisk = seasonReturns
    .filter((r) => !r.is_filed && r.due && r.due <= riskCutoff)
    .map((r) => ({ ...r, surcharge: surcharge(r.client_type), overdue: Boolean(r.due && r.due < today) }));
  const atlInactive = seasonReturns.filter((r) => r.atl_status === "inactive");
  const wealthFlags = seasonReturns
    .filter((r) => r.client_type === "individual" && isPrepared(r.status) && Math.abs(r.wealth_gap) > threshold)
    .sort((a, b) => Math.abs(b.wealth_gap) - Math.abs(a.wealth_gap));

  return {
    today, in7, in30, season, threshold,
    seasonReturns,
    upcoming,
    overdueReturns: upcoming.filter((r) => r.due && r.due < today),
    due7: upcoming.filter((r) => r.due && r.due >= today && r.due <= in7),
    due30: upcoming.filter((r) => r.due && r.due >= today),
    periodic,
    hearings: hearingsRes.data ?? [],
    notices: noticesRes.data ?? [],
    overdueNotices: (noticesRes.data ?? []).filter((n) => n.reply_due_date && n.reply_due_date < today),
    tasks: tasksRes.data ?? [],
    atlRisk,
    atlInactive,
    wealthFlags,
  };
}
