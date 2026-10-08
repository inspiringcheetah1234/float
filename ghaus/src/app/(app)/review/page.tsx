import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { ReviewList, type ReviewItem } from "./review-list";

export const metadata: Metadata = { title: "Review queue" };

export default async function ReviewPage({ searchParams }: PageProps<"/review">) {
  const ctx = await requirePermission("returns");
  const sp = await searchParams;
  const scope = ctx.isOwner && sp.scope === "all" ? "all" : "mine";
  const supabase = await createClient();
  let q = supabase
    .from("v_client_tax_years")
    .select("id, client_id, client_name, client_type, tax_year, assignee_id, reviewer_id, filing_due_date, updated_at, wealth_gap, payable_refundable, review_signed_off_at")
    .eq("return_status", "under_review")
    .order("filing_due_date", { ascending: true, nullsFirst: false });
  if (scope === "mine") q = q.eq("reviewer_id", ctx.userId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  // When each return entered review (for "waiting since")
  const ids = (data ?? []).map((r) => r.id!);
  const { data: moves } = ids.length
    ? await supabase
        .from("activity_log")
        .select("record_id, at")
        .eq("table_name", "client_tax_years")
        .in("record_id", ids)
        .eq("after->>return_status", "under_review")
        .contains("changed_fields", ["return_status"])
        .order("at", { ascending: false })
    : { data: [] };
  const since = new Map<string, string>();
  for (const m of moves ?? []) if (!since.has(m.record_id)) since.set(m.record_id, m.at);

  const items: ReviewItem[] = (data ?? []).map((r) => ({
    id: r.id!, client_id: r.client_id!, client_name: r.client_name!, client_type: r.client_type!, tax_year: r.tax_year!,
    assignee_id: r.assignee_id, reviewer_id: r.reviewer_id, due: r.filing_due_date, updated_at: r.updated_at!,
    payable: Number(r.payable_refundable), signed_off: Boolean(r.review_signed_off_at), since: since.get(r.id!) ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Review queue"
        description={scope === "mine" ? "Returns waiting for your sign-off" : "Everything waiting for review, across the firm"}
        actions={
          ctx.isOwner && (
            <div className="flex rounded-md border p-0.5">
              <Button asChild size="xs" variant={scope === "mine" ? "secondary" : "ghost"}><Link href="/review">Mine</Link></Button>
              <Button asChild size="xs" variant={scope === "all" ? "secondary" : "ghost"}><Link href="/review?scope=all">Whole firm</Link></Button>
            </div>
          )
        }
      />
      {items.length === 0 ? <EmptyState>Nothing is waiting for review.</EmptyState> : <ReviewList items={items} />}
      <p className="mt-4 text-xs text-muted-foreground">Notice replies join this queue in Phase 2.</p>
    </>
  );
}
