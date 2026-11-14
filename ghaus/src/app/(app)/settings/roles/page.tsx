import type { Metadata } from "next";
import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PermissionMatrix } from "./permission-matrix";

export const metadata: Metadata = { title: "Roles & permissions" };

export default async function RolesPage() {
  const ctx = await getContext();
  const supabase = await createClient();
  const [{ data: roles }, { data: perms }, { data: users }] = await Promise.all([
    supabase.from("roles").select("id, key, name, is_system").is("deleted_at", null).order("sort_order"),
    supabase.from("role_permissions").select("role_id, module, can_view, can_edit").is("deleted_at", null),
    supabase.from("users").select("role_id").eq("is_active", true).is("deleted_at", null),
  ]);
  const counts = new Map<string, number>();
  for (const u of users ?? []) counts.set(u.role_id, (counts.get(u.role_id) ?? 0) + 1);
  return (
    <PermissionMatrix
      roles={(roles ?? []).map((r) => ({ ...r, members: counts.get(r.id) ?? 0 }))}
      perms={perms ?? []}
      canEdit={ctx.can("settings", "edit")}
    />
  );
}
