import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface FirmUser {
  id: string;
  full_name: string;
  role_key: string;
  role_name: string;
  is_active: boolean;
}

/** Firm members for pickers and name lookups (active and inactive, so history still shows names). */
export const getFirmUsers = cache(async (): Promise<FirmUser[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, is_active, roles(key, name)")
    .is("deleted_at", null)
    .order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((u) => ({
    id: u.id,
    full_name: u.full_name,
    is_active: u.is_active,
    role_key: u.roles?.key ?? "",
    role_name: u.roles?.name ?? "",
  }));
});

export const getFirm = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("firms").select("*").single();
  if (error) throw new Error(error.message);
  return data;
});

export function userName(users: FirmUser[], id: string | null | undefined): string {
  if (!id) return "Unassigned";
  return users.find((u) => u.id === id)?.full_name ?? "Former user";
}
