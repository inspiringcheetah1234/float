"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbError, fail, ok, zUuid, type ActionResult } from "./_lib";

export async function recentNotifications() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, read_at, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(8);
  return data ?? [];
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  if (!zUuid.safeParse(id).success) return fail("Bad id");
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  if (error) return fail(dbError(error));
  revalidatePath("/", "layout");
  return ok(null);
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (error) return fail(dbError(error));
  revalidatePath("/", "layout");
  return ok(null);
}
