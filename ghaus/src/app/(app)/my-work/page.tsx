import type { Metadata } from "next";
import Link from "next/link";
import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/server/queries/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { DeadlineList, StatTile } from "@/components/app/dashboard";
import { DueBadge, DateText } from "@/components/app/format";
import { ReturnStatusBadge } from "@/components/app/status";
import { TaskList, type TaskRow } from "@/components/app/tasks-panel";
import { RETURN_STATUSES, returnRank } from "@/lib/domain/pipeline";
import { taxYearShort } from "@/lib/domain/tax-year";

export const metadata: Metadata = { title: "My work" };

export default async function MyWorkPage() {
  const ctx = await getContext();
  const supabase = await createClient();
  const [d, reviewRes, myReturnsRes] = await Promise.all([
    getDashboardData({ userId: ctx.userId }),
    ctx.can("returns")
      ? supabase.from("v_client_tax_years").select("id, client_id, client_name, tax_year, assignee_id, filing_due_date").eq("return_status", "under_review").eq("reviewer_id", ctx.userId).order("filing_due_date")
      : Promise.resolve({ data: [] as { id: string; client_id: string; client_name: string; tax_year: number; assignee_id: string | null; filing_due_date: string | null }[] }),
    ctx.can("returns")
      ? supabase.from("v_client_tax_years").select("id, client_id, client_name, tax_year, return_status, filing_due_date, is_filed").eq("assignee_id", ctx.userId).neq("return_status", "closed").order("filing_due_date")
      : Promise.resolve({ data: [] }),
  ]);
  const review = reviewRes.data ?? [];
  const myReturns = (myReturnsRes.data ?? []) as { id: string; client_id: string; client_name: string; tax_year: number; return_status: (typeof RETURN_STATUSES)[number]["value"]; filing_due_date: string | null; is_filed: boolean }[];
  const active = myReturns.filter((r) => returnRank(r.return_status) < returnRank("filed"));
  const tasks: TaskRow[] = d.tasks.map((t) => ({
    ...t,
    client_name: t.clients?.name ?? null,
    link: t.client_id ? `/clients/${t.client_id}${t.client_tax_years ? `?ty=${t.client_tax_years.tax_year}` : ""}` : null,
  }));
  const overdueTasks = tasks.filter((t) => t.due_date && t.due_date < d.today).length;

  return (
    <>
      <PageHeader title={`Assalam-o-Alaikum, ${ctx.member.full_name.split(" ")[0]}`} description="Your returns, reviews, tasks and deadlines" />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="My open returns" value={active.length} href="/season" />
        <StatTile label="Waiting for my review" value={review.length} tone={review.length ? "warning" : undefined} href="/review" />
        <StatTile label="My open tasks" value={tasks.length} sub={overdueTasks ? `${overdueTasks} overdue` : undefined} tone={overdueTasks ? "danger" : undefined} href="/tasks" />
        <StatTile label="My overdue returns" value={d.overdueReturns.length} tone={d.overdueReturns.length ? "danger" : undefined} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {review.length > 0 && (
          <Card className="lg:col-span-2 border-amber-300">
            <CardHeader>
              <div><CardTitle>Waiting for your sign-off</CardTitle><CardDescription>These cannot go to the client until you sign off</CardDescription></div>
              <Link href="/review" className="text-xs hover:underline">Review queue</Link>
            </CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {review.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-1.5">
                    <Link className="font-medium hover:underline" href={`/clients/${r.client_id}?ty=${r.tax_year}`}>{r.client_name} · {taxYearShort(r.tax_year!)}</Link>
                    <span className="text-xs"><DueBadge due={r.filing_due_date} /></span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader><div><CardTitle>My returns</CardTitle><CardDescription>Assigned to you, not yet filed</CardDescription></div></CardHeader>
          <CardContent>
            {active.length === 0 ? <p className="text-sm text-muted-foreground">No open returns assigned to you.</p> : (
              <ul className="divide-y text-sm">
                {active.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 py-1.5">
                    <span className="min-w-0">
                      <Link className="font-medium hover:underline" href={`/clients/${r.client_id}?ty=${r.tax_year}`}>{r.client_name}</Link>
                      <span className="text-xs text-muted-foreground"> · {taxYearShort(r.tax_year)}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-xs"><ReturnStatusBadge status={r.return_status} /> <DueBadge due={r.filing_due_date} /></span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>My deadlines</CardTitle><CardDescription>Next 30 days and overdue</CardDescription></div></CardHeader>
          <CardContent>
            <DeadlineList returns={d.upcoming} periodic={[]} emptyText="Nothing due in the next 30 days." />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><div><CardTitle>My tasks</CardTitle></div><Link href="/tasks" className="text-xs hover:underline">All tasks</Link></CardHeader>
          <CardContent><TaskList tasks={tasks.slice(0, 15)} showClient /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>My hearings</CardTitle></CardHeader>
          <CardContent>
            {d.hearings.length === 0 ? <p className="text-sm text-muted-foreground">No hearings in the next 7 days.</p> : (
              <ul className="divide-y text-sm">
                {d.hearings.map((h) => (
                  <li key={h.id} className="flex justify-between py-1.5"><span>{h.clients?.name} · {h.forum}</span><DateText value={h.hearing_date} /></li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>My notices</CardTitle></CardHeader>
          <CardContent>
            {d.notices.length === 0 ? <p className="text-sm text-muted-foreground">No open notices assigned to you. (Notices arrive in Phase 2.)</p> : (
              <ul className="divide-y text-sm">
                {d.notices.map((n) => (
                  <li key={n.id} className="flex justify-between py-1.5"><span>{n.clients?.name} · s.{n.section}</span><DueBadge due={n.reply_due_date} /></li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
