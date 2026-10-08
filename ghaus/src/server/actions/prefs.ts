"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError, fail, ok, type ActionResult } from "./_lib";

export async function setNumberFormat(format: "lakh" | "international"): Promise<ActionResult> {
  const parsed = z.enum(["lakh", "international"]).safeParse(format);
  if (!parsed.success) return fail("Unknown format");
  const ctx = await getContext();
  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ number_format: parsed.data }).eq("id", ctx.userId);
  if (error) return fail(dbError(error));
  revalidatePath("/", "layout");
  return ok(null);
}
