import type { Metadata } from "next";
import Link from "next/link";
import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { NewTaskButton, TaskList, type TaskRow } from "@/components/app/tasks-panel";
import { UserFilter } from "./user-filter";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const ctx = await getContext();
  const sp = await searchParams;
  const status = sp.status === "done" ? "done" : "open";
  const who = typeof sp.who === "string" && (sp.who === "all" || sp.who === "unassigned" || /^[0-9a-f-]{36}$/i.test(sp.who)) ? sp.who : ctx.userId;
  const supabase = await createClient();
  let q = supabase
    .from("tasks")
    .select("id, title, description, assignee_id, due_date, status, auto_rule_id, updated_at, client_id, client_tax_year_id, clients(name), client_tax_years(tax_year)")
    .is("deleted_at", null);
  q = status === "open" ? q.in("status", ["open", "in_progress"]) : q.in("status", ["done", "cancelled"]);
  if (who === "unassigned") q = q.is("assignee_id", null);
  else if (who !== "all") q = q.eq("assignee_id", who);
  const { data, error } = await q
    .order(status === "open" ? "due_date" : "completed_at", { ascending: status === "open", nullsFirst: false })
    .limit(300);
  if (error) throw new Error(error.message);

  const tasks: TaskRow[] = (data ?? []).map((t) => ({
    ...t,
    client_name: t.clients?.name ?? null,
    link: t.client_id ? `/clients/${t.client_id}${t.client_tax_years ? `?ty=${t.client_tax_years.tax_year}` : ""}` : null,
  }));
  const base = (s: string) => `/tasks?status=${s}${who !== ctx.userId ? `&who=${who}` : ""}`;

  return (
    <>
      <PageHeader title="Tasks" description={`${tasks.length} ${status === "open" ? "open" : "completed"}`} actions={<NewTaskButton link={{}} />} />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border p-0.5">
          <Button asChild size="xs" variant={status === "open" ? "secondary" : "ghost"}><Link href={base("open")}>Open</Link></Button>
          <Button asChild size="xs" variant={status === "done" ? "secondary" : "ghost"}><Link href={base("done")}>Done</Link></Button>
        </div>
        <UserFilter value={who} />
      </div>
      <TaskList tasks={tasks} showClient />
    </>
  );
}
