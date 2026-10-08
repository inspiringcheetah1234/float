import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/db";
import type { NumberFormat } from "@/lib/domain/money";

export type Module = Enums<"app_module">;
export type Action = "view" | "edit";

export interface Member {
  user_id: string;
  full_name: string;
  email: string;
  firm_id: string;
  firm_name: string;
  role_id: string;
  role_key: string;
  role_name: string;
  number_format: NumberFormat;
  requires_mfa: boolean;
  aal: string;
  permissions: Record<Module, { view: boolean; edit: boolean }>;
}

export interface Context {
  userId: string;
  email: string;
  member: Member;
  isOwner: boolean;
  numberFormat: NumberFormat;
  /** UI hint only; RLS is the real check. */
  can: (module: Module, action?: Action) => boolean;
}

/** Signed-in user + firm membership, or a redirect to where they need to go first. */
export const getContext = cache(async (): Promise<Context> => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/login");

  const { data: raw, error } = await supabase.rpc("get_my_context");
  if (error) throw new Error(error.message);
  const member = raw as unknown as Member | null;
  if (!member) redirect("/signup");

  // 2FA: required for owner and vault users; also verify anyone who has enrolled a factor.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const verified = aal?.currentLevel === "aal2";
  if ((member.requires_mfa || aal?.nextLevel === "aal2") && !verified) redirect("/mfa");

  return {
    userId: user.id,
    email: user.email ?? member.email,
    member,
    isOwner: member.role_key === "owner",
    numberFormat: member.number_format,
    can: (module, action = "view") => member.role_key === "owner" || Boolean(member.permissions?.[module]?.[action]),
  };
});

export async function requirePermission(module: Module, action: Action = "view"): Promise<Context> {
  const ctx = await getContext();
  if (!ctx.can(module, action)) redirect("/forbidden");
  return ctx;
}
