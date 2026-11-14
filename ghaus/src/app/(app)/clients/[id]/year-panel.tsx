import { createClient } from "@/lib/supabase/server";
import { getContext } from "@/lib/auth";
import { YearEditor } from "./year-editor";

export async function YearPanel({ clientId, clientName, yearId, threshold }: { clientId: string; clientName: string; yearId: string; threshold: number }) {
  const ctx = await getContext();
  const supabase = await createClient();
  const [{ data: row }, { data: items }, { data: tasks }, { data: comments }, { data: activity }, { data: trend }] = await Promise.all([
    supabase.from("v_client_tax_years").select("*").eq("id", yearId).single(),
    supabase.from("wealth_items").select("*").eq("client_tax_year_id", yearId).is("deleted_at", null).order("category").order("sort_order").order("created_at"),
    supabase.from("tasks").select("id, title, description, assignee_id, due_date, status, auto_rule_id, updated_at").eq("client_tax_year_id", yearId).is("deleted_at", null).order("status").order("due_date", { nullsFirst: false }),
    supabase.from("comments").select("id, body, mentions, created_by, created_at").eq("entity_type", "client_tax_year").eq("entity_id", yearId).is("deleted_at", null).order("created_at"),
    supabase
      .from("activity_log")
      .select("id, action, table_name, changed_fields, before, after, actor_id, at")
      .eq("client_id", clientId)
      .or(`record_id.eq.${yearId},after->>client_tax_year_id.eq.${yearId},after->>entity_id.eq.${yearId}`)
      .order("at", { ascending: false })
      .limit(80),
    supabase
      .from("v_client_tax_years")
      .select("tax_year, opening_wealth, effective_closing_wealth, total_declared_income, income_exempt, income_final_fixed, total_other_inflows, personal_expenses, other_outflows, wealth_gap, wealth_cash_equivalents")
      .eq("client_id", clientId)
      .order("tax_year"),
  ]);
  if (!row) return <p className="text-sm text-muted-foreground">This tax year could not be loaded.</p>;

  return (
    <YearEditor
      key={row.id}
      clientId={clientId}
      clientName={clientName}
      row={row}
      items={items ?? []}
      tasks={(tasks ?? []) as never}
      comments={comments ?? []}
      activity={activity ?? []}
      trend={(trend ?? []).map((t) => ({
        tax_year: t.tax_year!,
        opening: Number(t.opening_wealth),
        closing: Number(t.effective_closing_wealth),
        income: Number(t.total_declared_income) + Number(t.income_exempt) + Number(t.income_final_fixed),
        inflows: Number(t.total_other_inflows),
        outflows: Number(t.personal_expenses) + Number(t.other_outflows),
        gap: Number(t.wealth_gap),
        cash: Number(t.wealth_cash_equivalents),
      }))}
      threshold={threshold}
      canEdit={ctx.can("returns", "edit")}
      canComment={ctx.can("clients")}
    />
  );
}
