import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { filingSeasonYear } from "@/lib/domain/tax-year";
import { todayPK } from "@/lib/domain/dates";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { ClientFilters } from "./client-filters";
import { ClientsTable, type ClientRow } from "./clients-table";

export const metadata: Metadata = { title: "Clients" };

const PAGE_SIZE = 50;

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const ctx = await requirePermission("clients");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = str("q").trim();
  const type = str("type");
  const rawAssignee = str("assignee");
  // Only "none" or a UUID: the value is used inside a PostgREST filter expression.
  const assignee = rawAssignee === "none" || /^[0-9a-f-]{36}$/i.test(rawAssignee) ? rawAssignee : "";
  const state = str("state") || "active";
  const page = Math.max(1, Number(str("page")) || 1);
  const season = filingSeasonYear(todayPK());

  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select("id, name, client_type, cnic, ntn, phone, city, assignee_id, reviewer_id, is_active, updated_at", { count: "exact" });
  query = state === "archived" ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);
  if (state === "active") query = query.eq("is_active", true);
  if (state === "inactive") query = query.eq("is_active", false);
  if (type === "individual" || type === "aop" || type === "company") query = query.eq("client_type", type);
  if (assignee === "none") query = query.is("assignee_id", null);
  else if (assignee) query = query.or(`assignee_id.eq.${assignee},reviewer_id.eq.${assignee}`);
  if (q) {
    const text = q.replace(/[^\p{L}\p{N} .&'-]/gu, "").trim();
    let digits = q.replace(/\D/g, "");
    if (digits.startsWith("92") && digits.length === 12) digits = "0" + digits.slice(2);
    const ors = [text && `name.ilike.*${text}*`, digits.length >= 4 && `search_digits.like.*${digits}*`].filter(Boolean);
    if (ors.length) query = query.or(ors.join(","));
  }
  const { data, count, error } = await query.order("name").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error(error.message);

  const ids = (data ?? []).map((c) => c.id);
  const { data: years } = ids.length
    ? await supabase.from("client_tax_years").select("client_id, return_status").eq("tax_year", season).in("client_id", ids).is("deleted_at", null)
    : { data: [] };
  const statusByClient = new Map((years ?? []).map((y) => [y.client_id, y.return_status]));
  const rows: ClientRow[] = (data ?? []).map((c) => ({ ...c, season_status: statusByClient.get(c.id) ?? null }));
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => {
    const params = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
    params.set("page", String(p));
    return `/clients?${params}`;
  };

  return (
    <>
      <PageHeader
        title="Clients"
        description={`${total} ${total === 1 ? "client" : "clients"}`}
        actions={
          ctx.can("clients", "edit") && (
            <Button asChild size="sm">
              <Link href="/clients/new"><PlusIcon /> New client</Link>
            </Button>
          )
        }
      />
      <ClientFilters />
      <ClientsTable rows={rows} season={season} canEdit={ctx.can("clients", "edit")} canEditReturns={ctx.can("returns", "edit")} />
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          {page > 1 && <Button asChild variant="outline" size="sm"><Link href={pageHref(page - 1)}>Previous</Link></Button>}
          <span className="text-muted-foreground">Page {page} of {pages}</span>
          {page < pages && <Button asChild variant="outline" size="sm"><Link href={pageHref(page + 1)}>Next</Link></Button>}
        </div>
      )}
    </>
  );
}
