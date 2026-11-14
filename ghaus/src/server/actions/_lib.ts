import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { z } from "zod";

export interface Conflict {
  /** The record's current lock token; send it back to overwrite deliberately. */
  updatedAt: string;
  updatedBy: string | null;
}

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; conflict?: Conflict };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: string): ActionResult<never> => ({ ok: false, error });

/** Turns database errors into messages a lawyer can act on. Never echoes values (they may be sensitive). */
export function dbError(error: PostgrestError | null | undefined): string {
  if (!error) return "Something went wrong.";
  switch (error.code) {
    case "42501":
      return error.message?.startsWith("new row violates") || !error.message
        ? "You don't have permission to do that."
        : error.message;
    case "23505":
      if (error.message.includes("cnic")) return "Another client in this firm already has that CNIC.";
      if (error.message.includes("ntn")) return "Another client in this firm already has that NTN.";
      if (error.message.includes("client_tax_years")) return "That tax year already exists for this client.";
      return "That record already exists.";
    case "23514":
      if (error.message.includes("cnic")) return "CNIC must be in the format 12345-1234567-1.";
      return "One of the values is not allowed.";
    case "23503":
      return "A linked record is missing or belongs to another firm.";
    case "P0001":
      return error.message;
    case "PGRST116":
      return "Record not found.";
    default:
      return "The database rejected that change. Please check the values and try again.";
  }
}

export function zodError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "Invalid input.";
  const field = first.path.join(".");
  return field ? `${field.replace(/_/g, " ")}: ${first.message}` : first.message;
}

type TableName = keyof Database["public"]["Tables"];

/**
 * Optimistic-locking update. Succeeds only if the row still has the updated_at the user loaded.
 * On a mismatch returns a conflict with the current token and who changed it.
 */
export async function updateWithLock<T extends TableName>(
  supabase: ServerSupabase,
  table: T,
  id: string,
  expectedUpdatedAt: string,
  patch: Database["public"]["Tables"][T]["Update"],
): Promise<ActionResult<{ updated_at: string }>> {
  // The generic Supabase types do not narrow well over a table-name union; the table/patch pair is typed by the caller.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = (supabase.from(table) as any)
    .update(patch)
    .eq("id", id)
    .eq("updated_at", expectedUpdatedAt)
    .select("updated_at")
    .maybeSingle();
  const { data, error } = (await q) as { data: { updated_at: string } | null; error: PostgrestError | null };
  if (error) return fail(dbError(error));
  if (data) return ok(data);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = (await (supabase.from(table) as any)
    .select("updated_at, updated_by")
    .eq("id", id)
    .maybeSingle()) as { data: { updated_at: string; updated_by: string | null } | null };
  if (!current) return fail("Record not found, or you don't have permission to change it.");

  let updatedBy: string | null = null;
  if (current.updated_by) {
    const { data: u } = await supabase.from("users").select("full_name").eq("id", current.updated_by).maybeSingle();
    updatedBy = u?.full_name ?? null;
  }
  return {
    ok: false,
    error: `${updatedBy ?? "Someone"} changed this record after you opened it.`,
    conflict: { updatedAt: current.updated_at, updatedBy },
  };
}

// ---- zod helpers -----------------------------------------------------------
export const zUuid = z.string().uuid();
export const zOptUuid = z.preprocess((v) => (v === "" ? null : v), z.string().uuid().nullable()).optional();
export const zOptText = z.preprocess(
  (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v ?? null),
  z.string().max(5000).nullable(),
).optional();
export const zText = z.string().trim().min(1, "is required").max(500);
export const zAmount = z.coerce.number().finite().min(-1e14).max(1e14);
export const zOptDate = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date").nullable(),
).optional();
export const zLockToken = z.string().min(10);
