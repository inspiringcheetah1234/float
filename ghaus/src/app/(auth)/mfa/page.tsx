import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MfaForm } from "./mfa-form";

export const metadata: Metadata = { title: "Two-factor authentication" };

export default async function MfaPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const { data: ctx } = await supabase.rpc("get_my_context");
  if (!ctx) redirect("/signup");
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") redirect("/");
  const required = Boolean((ctx as { requires_mfa?: boolean }).requires_mfa);
  return <MfaForm required={required} email={data.user.email ?? ""} />;
}
