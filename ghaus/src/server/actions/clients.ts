"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formatCnic } from "@/lib/domain/cnic";
import {
  dbError, fail, ok, updateWithLock, zLockToken, zodError, zOptDate, zOptText, zOptUuid, zText, zUuid, type ActionResult,
} from "./_lib";

const zCnic = z.preprocess((v) => {
  if (typeof v !== "string" || v.trim() === "") return null;
  return formatCnic(v) ?? v.trim();
}, z.string().regex(/^\d{5}-\d{7}-\d$/, "must be 13 digits, e.g. 35202-1234567-1").nullable());

const zRegNo = z.preprocess(
  (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : null),
  z.string().regex(/^[0-9A-Za-z-]{1,20}$/, "may contain only digits, letters and dashes").nullable(),
);

const ClientInput = z.object({
  client_type: z.enum(["individual", "aop", "company"]),
  name: zText,
  cnic: zCnic,
  ntn: zRegNo,
  strn: zRegNo,
  phone: zOptText,
  whatsapp: zOptText,
  email: z.preprocess((v) => (v === "" ? null : v), z.string().email("is not a valid email").nullable()),
  address: zOptText,
  city: zOptText,
  referred_by: zOptText,
  assignee_id: zOptUuid,
  reviewer_id: zOptUuid,
  is_active: z.boolean().default(true),
  notes: zOptText,
});
export type ClientInputValues = z.input<typeof ClientInput>;

export async function createClientRecord(input: ClientInputValues): Promise<ActionResult<{ id: string }>> {
  const parsed = ClientInput.safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").insert(parsed.data).select("id").single();
  if (error) return fail(dbError(error));
  revalidatePath("/clients");
  return ok({ id: data.id });
}

export async function updateClientRecord(id: string, updatedAt: string, input: ClientInputValues): Promise<ActionResult<{ updated_at: string }>> {
  const parsed = ClientInput.safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  if (!zUuid.safeParse(id).success || !zLockToken.safeParse(updatedAt).success) return fail("Bad request");
  const supabase = await createClient();
  const res = await updateWithLock(supabase, "clients", id, updatedAt, parsed.data);
  if (res.ok) revalidatePath(`/clients/${id}`);
  return res;
}

export async function setClientArchived(id: string, updatedAt: string, archived: boolean): Promise<ActionResult<{ updated_at: string }>> {
  if (!zUuid.safeParse(id).success) return fail("Bad request");
  const supabase = await createClient();
  const res = await updateWithLock(supabase, "clients", id, updatedAt, { deleted_at: archived ? new Date().toISOString() : null });
  if (res.ok) revalidatePath("/clients");
  return res;
}

const BulkInput = z.object({
  ids: z.array(zUuid).min(1, "Select at least one client").max(500),
  assignee_id: z.union([zUuid, z.literal("none")]).optional(),
  reviewer_id: z.union([zUuid, z.literal("none")]).optional(),
  also_tax_year: z.number().int().min(2000).max(2100).nullable().optional(),
});

/** Bulk reassignment. Optionally also reassigns those clients' unfiled returns for one tax year. */
export async function bulkReassignClients(input: z.input<typeof BulkInput>): Promise<ActionResult<{ count: number }>> {
  const parsed = BulkInput.safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  const { ids, assignee_id, reviewer_id, also_tax_year } = parsed.data;
  const patch: { assignee_id?: string | null; reviewer_id?: string | null } = {};
  if (assignee_id) patch.assignee_id = assignee_id === "none" ? null : assignee_id;
  if (reviewer_id) patch.reviewer_id = reviewer_id === "none" ? null : reviewer_id;
  if (Object.keys(patch).length === 0) return fail("Choose an assignee or a reviewer.");

  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").update(patch).in("id", ids).is("deleted_at", null).select("id");
  if (error) return fail(dbError(error));
  if (also_tax_year) {
    const { error: e2 } = await supabase
      .from("client_tax_years")
      .update(patch)
      .in("client_id", ids)
      .eq("tax_year", also_tax_year)
      .is("deleted_at", null)
      .not("return_status", "in", "(filed,acknowledgment_uploaded,closed)");
    if (e2) return fail(dbError(e2));
  }
  revalidatePath("/clients");
  revalidatePath("/season");
  return ok({ count: data?.length ?? 0 });
}

// ---- Provincial registrations -----------------------------------------------
const RegistrationInput = z.object({
  client_id: zUuid,
  authority: z.enum(["PRA", "SRB", "KPRA", "BRA", "other"]),
  registration_no: zText,
  registered_on: zOptDate,
  notes: zOptText,
});

export async function addRegistration(input: z.input<typeof RegistrationInput>): Promise<ActionResult> {
  const parsed = RegistrationInput.safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase.from("client_registrations").insert(parsed.data);
  if (error) return fail(dbError(error));
  revalidatePath(`/clients/${parsed.data.client_id}`);
  return ok(null);
}

export async function removeRegistration(id: string, clientId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("client_registrations").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return fail(dbError(error));
  revalidatePath(`/clients/${clientId}`);
  return ok(null);
}

// ---- Relations ----------------------------------------------------------------
const RelationInput = z.object({
  client_id: zUuid,
  related_client_id: zUuid,
  relation: z.enum(["spouse", "parent", "child", "sibling", "director", "partner", "member", "shareholder"]),
  notes: zOptText,
});

export async function addRelation(input: z.input<typeof RelationInput>): Promise<ActionResult> {
  const parsed = RelationInput.safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  if (parsed.data.client_id === parsed.data.related_client_id) return fail("A client cannot be related to themselves.");
  const supabase = await createClient();
  const { error } = await supabase.from("client_relations").insert(parsed.data);
  if (error) return fail(error.code === "23505" ? "That relation already exists." : dbError(error));
  revalidatePath(`/clients/${parsed.data.client_id}`);
  revalidatePath(`/clients/${parsed.data.related_client_id}`);
  return ok(null);
}

export async function removeRelation(id: string, clientId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("client_relations").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return fail(dbError(error));
  revalidatePath(`/clients/${clientId}`);
  return ok(null);
}
