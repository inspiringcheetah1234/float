"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dbError, fail, ok, zodError, zUuid, type ActionResult } from "./_lib";

const CommentInput = z.object({
  entity_type: z.enum(["client", "client_tax_year", "notice", "appeal"]),
  entity_id: zUuid,
  client_id: zUuid,
  body: z.string().trim().min(1, "Write something first").max(5000),
  mentions: z.array(zUuid).max(20).default([]),
});

export async function addComment(input: z.input<typeof CommentInput>): Promise<ActionResult> {
  const parsed = CommentInput.safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({ ...parsed.data, mentions: [...new Set(parsed.data.mentions)] });
  if (error) return fail(dbError(error));
  revalidatePath(`/clients/${parsed.data.client_id}`);
  return ok(null);
}

export async function deleteComment(id: string, clientId: string): Promise<ActionResult> {
  if (!zUuid.safeParse(id).success) return fail("Bad request");
  const supabase = await createClient();
  const { data, error } = await supabase.from("comments").update({ deleted_at: new Date().toISOString() }).eq("id", id).select("id");
  if (error) return fail(dbError(error));
  if (!data?.length) return fail("You can only delete your own comments.");
  revalidatePath(`/clients/${clientId}`);
  return ok(null);
}
