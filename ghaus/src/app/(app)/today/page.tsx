import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/server/queries/dashboard";
import { getFirm } from "@/server/queries/common";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { AtlRisk, DeadlineList, StageBars, StatTile, WealthFlags } from "@/components/app/dashboard";
import { DateText, Money, UserName } from "@/components/app/format";
import { formatDate } from "@/lib/domain/dates";
import { taxYearLabel } from "@/lib/domain/tax-year";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const ctx = await getContext();
  if (!ctx.isOwner) redirect("/my-work");
  const supabase = await createClient();
  const [d, firm, review, fees] = await Promise.all([
    getDashboardData({}),
    getFirm(),
    supabase.from("client_tax_years").select("id", { count: "exact", head: true }).eq("return_status", "under_review").is("deleted_at", null),
    supabase.from("v_invoice_balances").select("balance"),
  ]);
  const outstanding = (fees.data ?? []).reduce((s, r) => s + Math.max(0, Number(r.balance)), 0);
  const overdueTasks = d.tasks.filter((t) => t.due_date && t.due_date < d.today);
  const due7periodic = d.periodic.filter((p) => p.due_date <= d.in7);

  return (
    <>
      <PageHeader title="Today" description={`${formatDate(d.today)} · ${taxYearLabel(d.season)} filing season`} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Deadlines in 7 days" value={d.due7.length + due7periodic.length} sub={`${d.due30.length} returns in 30 days`} href="/season" />
        <StatTile label="Overdue returns" value={d.overdueReturns.length} tone={d.overdueReturns.length ? "danger" : undefined} href="/season?overdue=1" />
        <StatTile label="Review queue" value={review.count ?? 0} tone={(review.count ?? 0) > 0 ? "warning" : undefined} href="/review?scope=all" />
        <StatTile label="Overdue replies" value={d.overdueNotices.length} tone={d.overdueNotices.length ? "danger" : undefined} sub="Notices (Phase 2)" />
        <StatTile label="Overdue tasks" value={overdueTasks.length} tone={overdueTasks.length ? "danger" : undefined} href="/tasks?who=all" />
        <StatTile label="Outstanding fees" value={<Money value={outstanding} compact />} sub="Fees (Phase 3)" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Deadlines: next 30 days and overdue</CardTitle>
              <CardDescription>From Settings → Deadlines, including extensions</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <DeadlineList returns={d.upcoming} periodic={d.periodic} emptyText="Nothing due in the next 30 days." limit={15} />
          </CardContent>
        </Card>
        <div className="grid content-start gap-4">
          <StageBars returns={d.seasonReturns} ty={d.season} />
          <Card>
            <CardHeader><CardTitle>Hearings this week</CardTitle></CardHeader>
            <CardContent>
              {d.hearings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hearings in the next 7 days.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {d.hearings.map((h) => (
                    <li key={h.id} className="flex justify-between gap-2 py-1.5">
                      <span><Link className="font-medium hover:underline" href={`/clients/${h.client_id}`}>{h.clients?.name}</Link> · {h.forum}</span>
                      <span className="text-xs"><DateText value={h.hearing_date} /> · <UserName id={h.appearing_user_id} /></span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Wealth gaps</CardTitle>
              <CardDescription>Above <Money value={d.threshold} /> on prepared returns</CardDescription>
            </div>
          </CardHeader>
          <CardContent><WealthFlags rows={d.wealthFlags} /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>ATL risk</CardTitle>
              <CardDescription>Late filing means paying a surcharge to get back on the ATL</CardDescription>
            </div>
          </CardHeader>
          <CardContent><AtlRisk risk={d.atlRisk} inactive={d.atlInactive} riskDays={Number(firm.atl_risk_days)} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Overdue tasks</CardTitle></CardHeader>
          <CardContent>
            {overdueTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">None.</p>
            ) : (
              <ul className="divide-y text-sm">
                {overdueTasks.slice(0, 8).map((t) => (
                  <li key={t.id} className="flex justify-between gap-2 py-1.5">
                    <span className="min-w-0 truncate">{t.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground"><UserName id={t.assignee_id} /> · <DateText value={t.due_date} /></span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
