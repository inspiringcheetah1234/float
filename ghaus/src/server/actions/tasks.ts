"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dbError, fail, ok, updateWithLock, zodError, zOptDate, zOptText, zOptUuid, zUuid, type ActionResult } from "./_lib";

const TaskInput = z.object({
  title: z.string().trim().min(1, "is required").max(300),
  description: zOptText,
  assignee_id: zOptUuid,
  due_date: zOptDate,
  client_id: zOptUuid,
  client_tax_year_id: zOptUuid,
  notice_id: zOptUuid,
  appeal_id: zOptUuid,
});
export type TaskValues = z.input<typeof TaskInput>;

function revalidateTasks() {
  revalidatePath("/tasks");
  revalidatePath("/my-work");
  revalidatePath("/today");
  revalidatePath("/clients/[id]", "page");
}

export async function createTask(input: TaskValues): Promise<ActionResult> {
  const parsed = TaskInput.safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  const supabase = await createClient();
  let data = parsed.data;
  // A task on a client-year is also a task on that client.
  if (data.client_tax_year_id && !data.client_id) {
    const { data: cty } = await supabase.from("client_tax_years").select("client_id").eq("id", data.client_tax_year_id).single();
    data = { ...data, client_id: cty?.client_id ?? null };
  }
  const { error } = await supabase.from("tasks").insert(data);
  if (error) return fail(dbError(error));
  revalidateTasks();
  return ok(null);
}

export async function setTaskStatus(id: string, updatedAt: string, status: "open" | "in_progress" | "done" | "cancelled"): Promise<ActionResult<{ updated_at: string }>> {
  if (!zUuid.safeParse(id).success) return fail("Bad request");
  if (!["open", "in_progress", "done", "cancelled"].includes(status)) return fail("Bad status");
  const supabase = await createClient();
  const res = await updateWithLock(supabase, "tasks", id, updatedAt, { status });
  if (res.ok) revalidateTasks();
  return res;
}

export async function updateTask(id: string, updatedAt: string, input: Pick<TaskValues, "title" | "description" | "assignee_id" | "due_date">): Promise<ActionResult<{ updated_at: string }>> {
  const parsed = TaskInput.pick({ title: true, description: true, assignee_id: true, due_date: true }).safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  const supabase = await createClient();
  const res = await updateWithLock(supabase, "tasks", id, updatedAt, parsed.data);
  if (res.ok) revalidateTasks();
  return res;
}
