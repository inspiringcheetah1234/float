import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getFirm } from "@/server/queries/common";
import { todayPK } from "@/lib/domain/dates";
import { filingSeasonYear, taxYearLabel, taxYearOptions } from "@/lib/domain/tax-year";
import { returnRank, type ReturnStatus } from "@/lib/domain/pipeline";
import { PageHeader } from "@/components/app/page-header";
import { SeasonFilters } from "./season-filters";
import { SeasonBoard, type SeasonCard } from "./season-board";
import { SeasonList } from "./season-list";
import { StartSeasonButton } from "./start-season-button";

export const metadata: Metadata = { title: "Filing season" };

export default async function SeasonPage({ searchParams }: PageProps<"/season">) {
  const ctx = await requirePermission("returns");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const today = todayPK();
  const ty = Number(str("ty")) || filingSeasonYear(today);
  const view = str("view") === "list" ? "list" : "board";

  const supabase = await createClient();
  let q = supabase
    .from("v_client_tax_years")
    .select("id, client_id, client_name, client_type, return_status, assignee_id, reviewer_id, filing_due_date, is_filed, review_signed_off_at, wealth_gap, atl_status, updated_at")
    .eq("tax_year", ty);
  const isId = (v: string) => /^[0-9a-f-]{36}$/i.test(v);
  const assignee = str("assignee") === "none" || isId(str("assignee")) ? str("assignee") : "";
  const reviewer = isId(str("reviewer")) ? str("reviewer") : "";
  const type = str("type");
  if (assignee === "none") q = q.is("assignee_id", null);
  else if (assignee) q = q.eq("assignee_id", assignee);
  if (reviewer) q = q.eq("reviewer_id", reviewer);
  if (type === "individual" || type === "aop" || type === "company") q = q.eq("client_type", type);
  const [{ data, error }, firm, { count: activeClients }] = await Promise.all([
    q.order("client_name"),
    getFirm(),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("is_active", true).is("deleted_at", null),
  ]);
  if (error) throw new Error(error.message);

  const threshold = Number(firm.wealth_gap_threshold);
  let cards: SeasonCard[] = (data ?? []).map((r) => {
    const status = r.return_status as ReturnStatus;
    const prepared = returnRank(status) >= returnRank("in_preparation");
    return {
      id: r.id!,
      client_id: r.client_id!,
      client_name: r.client_name!,
      client_type: r.client_type!,
      status,
      assignee_id: r.assignee_id,
      reviewer_id: r.reviewer_id,
      due: r.filing_due_date,
      overdue: !r.is_filed && Boolean(r.filing_due_date) && r.filing_due_date! < today,
      signed_off: Boolean(r.review_signed_off_at),
      gap_flag: r.client_type === "individual" && prepared && Math.abs(Number(r.wealth_gap)) > threshold,
      atl_inactive: r.atl_status === "inactive",
      updated_at: r.updated_at!,
    };
  });
  const total = cards.length;
  if (str("overdue") === "1") cards = cards.filter((c) => c.overdue);
  const filed = cards.filter((c) => returnRank(c.status) >= returnRank("filed")).length;
  const overdue = cards.filter((c) => c.overdue).length;
  const missing = Math.max(0, (activeClients ?? 0) - total);
  const filtered = Boolean(assignee || reviewer || type);

  return (
    <>
      <PageHeader
        title="Filing season"
        description={
          <>
            {taxYearLabel(ty)} · {cards.length} returns · {filed} filed · {overdue > 0 ? <span className="font-medium text-red-700">{overdue} overdue</span> : "none overdue"}
          </>
        }
        actions={ctx.can("returns", "edit") && !filtered && missing > 0 && <StartSeasonButton taxYear={ty} missing={missing} />}
      />
      <SeasonFilters years={taxYearOptions(today, 6)} ty={ty} />
      {view === "board" ? (
        <SeasonBoard cards={cards} canEdit={ctx.can("returns", "edit")} />
      ) : (
        <SeasonList cards={cards} canEdit={ctx.can("returns", "edit")} />
      )}
    </>
  );
}
