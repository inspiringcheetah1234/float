import type { Metadata } from "next";
import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UsersTable } from "./users-table";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const ctx = await getContext();
  const supabase = await createClient();
  const [{ data: users }, { data: roles }] = await Promise.all([
    supabase.from("users").select("id, full_name, email, phone, role_id, is_active, updated_at").is("deleted_at", null).order("full_name"),
    supabase.from("roles").select("id, key, name").is("deleted_at", null).order("sort_order"),
  ]);
  return <UsersTable users={users ?? []} roles={roles ?? []} canEdit={ctx.can("settings", "edit")} isOwner={ctx.isOwner} me={ctx.userId} />;
}
