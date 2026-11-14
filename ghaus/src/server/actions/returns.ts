"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RETURN_STATUSES } from "@/lib/domain/pipeline";
import {
  dbError, fail, ok, updateWithLock, zAmount, zLockToken, zodError, zOptDate, zOptText, zOptUuid, zUuid, type ActionResult,
} from "./_lib";

const zTaxYear = z.number().int().min(2000).max(2100);
const zStatus = z.enum(RETURN_STATUSES.map((s) => s.value) as [string, ...string[]]);

function revalidateReturn(clientId?: string) {
  if (clientId) revalidatePath(`/clients/${clientId}`);
  revalidatePath("/season");
  revalidatePath("/review");
  revalidatePath("/today");
  revalidatePath("/my-work");
}

/** Previous year's closing net assets become this year's opening wealth. */
async function previousClosing(supabase: Awaited<ReturnType<typeof createClient>>, clientId: string, taxYear: number) {
  const { data } = await supabase
    .from("v_client_tax_years")
    .select("effective_closing_wealth")
    .eq("client_id", clientId)
    .eq("tax_year", taxYear - 1)
    .maybeSingle();
  return Number(data?.effective_closing_wealth ?? 0);
}

export async function createTaxYear(input: { client_id: string; tax_year: number }): Promise<ActionResult<{ tax_year: number }>> {
  const parsed = z.object({ client_id: zUuid, tax_year: zTaxYear }).safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  const supabase = await createClient();
  const { data: client, error: ce } = await supabase
    .from("clients").select("assignee_id, reviewer_id").eq("id", parsed.data.client_id).single();
  if (ce) return fail(dbError(ce));
  const { error } = await supabase.from("client_tax_years").insert({
    client_id: parsed.data.client_id,
    tax_year: parsed.data.tax_year,
    assignee_id: client.assignee_id,
    reviewer_id: client.reviewer_id,
    opening_wealth: await previousClosing(supabase, parsed.data.client_id, parsed.data.tax_year),
  });
  if (error) return fail(dbError(error));
  revalidateReturn(parsed.data.client_id);
  return ok({ tax_year: parsed.data.tax_year });
}

/** Creates a "Not started" record for every active client that has none for the tax year. */
export async function startSeason(taxYear: number): Promise<ActionResult<{ created: number }>> {
  if (!zTaxYear.safeParse(taxYear).success) return fail("Bad tax year");
  const supabase = await createClient();
  const [{ data: clients, error: e1 }, { data: existing, error: e2 }, { data: prev }] = await Promise.all([
    supabase.from("clients").select("id, assignee_id, reviewer_id").eq("is_active", true).is("deleted_at", null),
    supabase.from("client_tax_years").select("client_id").eq("tax_year", taxYear).is("deleted_at", null),
    supabase.from("v_client_tax_years").select("client_id, effective_closing_wealth").eq("tax_year", taxYear - 1),
  ]);
  if (e1 || e2) return fail(dbError(e1 ?? e2));
  const have = new Set((existing ?? []).map((r) => r.client_id));
  const opening = new Map((prev ?? []).map((r) => [r.client_id, Number(r.effective_closing_wealth ?? 0)]));
  const rows = (clients ?? [])
    .filter((c) => !have.has(c.id))
    .map((c) => ({
      client_id: c.id,
      tax_year: taxYear,
      assignee_id: c.assignee_id,
      reviewer_id: c.reviewer_id,
      opening_wealth: opening.get(c.id) ?? 0,
    }));
  if (rows.length) {
    const { error } = await supabase.from("client_tax_years").insert(rows);
    if (error) return fail(dbError(error));
  }
  revalidateReturn();
  return ok({ created: rows.length });
}

const amount = zAmount.optional();
const FiguresInput = z.object({
  income_salary: amount,
  income_property: amount,
  income_business: amount,
  income_capital_gains: amount,
  income_other_sources: amount,
  income_exempt: amount,
  income_final_fixed: amount,
  taxable_income: amount,
  tax_chargeable: amount,
  tax_withheld_paid: amount,
  opening_wealth: amount,
  closing_wealth: amount,
  personal_expenses: amount,
  inflow_gifts: amount,
  inflow_inheritance: amount,
  inflow_loans: amount,
  inflow_foreign_remittance: amount,
  inflow_other: amount,
  other_outflows: amount,
  filed_on: zOptDate.optional(),
  acknowledgment_no: zOptText.optional(),
  atl_status: z.enum(["unknown", "active", "inactive"]).optional(),
  atl_last_checked_on: zOptDate.optional(),
  notes: zOptText.optional(),
  assignee_id: zOptUuid.optional(),
  reviewer_id: zOptUuid.optional(),
}).strict();
export type ReturnFigures = z.input<typeof FiguresInput>;

export async function updateReturn(id: string, updatedAt: string, input: ReturnFigures): Promise<ActionResult<{ updated_at: string }>> {
  const parsed = FiguresInput.safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  if (!zUuid.safeParse(id).success || !zLockToken.safeParse(updatedAt).success) return fail("Bad request");
  for (const [k, val] of Object.entries(parsed.data)) {
    if (typeof val === "number" && val < 0 && k !== "taxable_income") return fail(`${k.replace(/_/g, " ")} cannot be negative`);
  }
  const supabase = await createClient();
  const res = await updateWithLock(supabase, "client_tax_years", id, updatedAt, parsed.data);
  if (res.ok) revalidateReturn();
  return res;
}

export async function moveReturn(id: string, updatedAt: string, to: string): Promise<ActionResult<{ updated_at: string }>> {
  const parsed = z.object({ id: zUuid, updatedAt: zLockToken, to: zStatus }).safeParse({ id, updatedAt, to });
  if (!parsed.success) return fail("Bad request");
  const supabase = await createClient();
  const res = await updateWithLock(supabase, "client_tax_years", id, updatedAt, {
    return_status: parsed.data.to as never,
  });
  if (res.ok) revalidateReturn();
  return res;
}

/** Reviewer sign-off; optionally sends the return on to the client in the same step. */
export async function signOffReturn(id: string, updatedAt: string, andSend: boolean): Promise<ActionResult<{ updated_at: string }>> {
  if (!zUuid.safeParse(id).success || !zLockToken.safeParse(updatedAt).success) return fail("Bad request");
  const supabase = await createClient();
  const signed = await updateWithLock(supabase, "client_tax_years", id, updatedAt, { review_signed_off_at: new Date().toISOString() });
  if (!signed.ok || !andSend) {
    if (signed.ok) revalidateReturn();
    return signed;
  }
  const sent = await updateWithLock(supabase, "client_tax_years", id, signed.data.updated_at, { return_status: "sent_for_client_approval" });
  revalidateReturn();
  return sent;
}

/** Reviewer sends work back to the preparer, with an optional comment that @mentions them. */
export async function sendBackReturn(id: string, updatedAt: string, note: string | null): Promise<ActionResult<{ updated_at: string }>> {
  if (!zUuid.safeParse(id).success || !zLockToken.safeParse(updatedAt).success) return fail("Bad request");
  const supabase = await createClient();
  const res = await updateWithLock(supabase, "client_tax_years", id, updatedAt, { return_status: "in_preparation" });
  if (!res.ok) return res;
  const text = note?.trim();
  if (text) {
    const { data: row } = await supabase.from("client_tax_years").select("client_id, assignee_id").eq("id", id).single();
    if (row) {
      await supabase.from("comments").insert({
        entity_type: "client_tax_year",
        entity_id: id,
        client_id: row.client_id,
        body: `Sent back for rework: ${text}`,
        mentions: row.assignee_id ? [row.assignee_id] : [],
      });
    }
  }
  revalidateReturn();
  return res;
}

export async function bulkReassignReturns(input: {
  ids: string[]; assignee_id?: string; reviewer_id?: string;
}): Promise<ActionResult<{ count: number }>> {
  const parsed = z.object({
    ids: z.array(zUuid).min(1, "Select at least one return").max(1000),
    assignee_id: z.union([zUuid, z.literal("none")]).optional(),
    reviewer_id: z.union([zUuid, z.literal("none")]).optional(),
  }).safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  const patch: { assignee_id?: string | null; reviewer_id?: string | null } = {};
  if (parsed.data.assignee_id) patch.assignee_id = parsed.data.assignee_id === "none" ? null : parsed.data.assignee_id;
  if (parsed.data.reviewer_id) patch.reviewer_id = parsed.data.reviewer_id === "none" ? null : parsed.data.reviewer_id;
  if (!Object.keys(patch).length) return fail("Choose an assignee or a reviewer.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("client_tax_years").update(patch).in("id", parsed.data.ids).select("id");
  if (error) return fail(dbError(error));
  revalidateReturn();
  return ok({ count: data?.length ?? 0 });
}

export async function archiveTaxYear(id: string, updatedAt: string): Promise<ActionResult<{ updated_at: string }>> {
  const ctx = await getContext();
  if (!ctx.can("returns", "edit")) return fail("You don't have permission to do that.");
  const supabase = await createClient();
  const res = await updateWithLock(supabase, "client_tax_years", id, updatedAt, { deleted_at: new Date().toISOString() });
  if (res.ok) revalidateReturn();
  return res;
}

// ---- Wealth statement lines ----------------------------------------------------
const WealthItemInput = z.object({
  category: z.enum(["immovable_property", "vehicle", "bank_balance", "cash", "gold", "securities", "receivables", "business_capital", "liabilities", "other"]),
  description: z.string().trim().min(1, "is required").max(500),
  cost: zAmount.refine((n) => n >= 0, "cannot be negative"),
  is_cash_equivalent: z.boolean(),
});
export type WealthItemValues = z.input<typeof WealthItemInput>;

export async function addWealthItem(clientTaxYearId: string, input: WealthItemValues): Promise<ActionResult> {
  const parsed = WealthItemInput.safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  if (!zUuid.safeParse(clientTaxYearId).success) return fail("Bad request");
  const supabase = await createClient();
  const { data: cty, error: ce } = await supabase.from("client_tax_years").select("client_id").eq("id", clientTaxYearId).single();
  if (ce) return fail(dbError(ce));
  const { error } = await supabase
    .from("wealth_items")
    .insert({ ...parsed.data, client_tax_year_id: clientTaxYearId, client_id: cty.client_id });
  if (error) return fail(dbError(error));
  revalidateReturn();
  return ok(null);
}

export async function updateWealthItem(id: string, updatedAt: string, input: WealthItemValues): Promise<ActionResult<{ updated_at: string }>> {
  const parsed = WealthItemInput.safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  const supabase = await createClient();
  const res = await updateWithLock(supabase, "wealth_items", id, updatedAt, parsed.data);
  if (res.ok) revalidateReturn();
  return res;
}

export async function removeWealthItem(id: string, updatedAt: string): Promise<ActionResult<{ updated_at: string }>> {
  const supabase = await createClient();
  const res = await updateWithLock(supabase, "wealth_items", id, updatedAt, { deleted_at: new Date().toISOString() });
  if (res.ok) revalidateReturn();
  return res;
}
