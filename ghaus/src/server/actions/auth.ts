"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, type ActionResult } from "./_lib";

const LoginInput = z.object({ email: z.string().trim().email(), password: z.string().min(1), next: z.string().optional() });

export async function signIn(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = LoginInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Enter your email and password.");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return fail("Email or password is incorrect.");
  const next = parsed.data.next && parsed.data.next.startsWith("/") && !parsed.data.next.startsWith("//") ? parsed.data.next : "/";
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const SignupInput = z.object({
  firm_name: z.string().trim().min(2, "Firm name is required").max(200),
  full_name: z.string().trim().min(2, "Your name is required").max(200),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(10, "Password must be at least 10 characters"),
});

/** Creates a new firm with the caller as Owner. Only when ALLOW_FIRM_SIGNUP=true. */
export async function signUpFirm(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (process.env.ALLOW_FIRM_SIGNUP !== "true") return fail("New firm sign-up is turned off. Ask your firm's Owner for a login.");
  const parsed = SignupInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
  const supabase = await createClient();

  const { data: existing } = await supabase.auth.getUser();
  if (!existing.user) {
    const { data, error } = await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password });
    if (error) return fail(error.message);
    if (!data.session) return fail("Check your email to confirm your address, then sign in to finish creating the firm.");
  }
  const { error: rpcError } = await supabase.rpc("create_firm", {
    p_firm_name: parsed.data.firm_name,
    p_full_name: parsed.data.full_name,
  });
  if (rpcError) return fail(rpcError.message);
  // The Owner must set up 2FA before seeing any data.
  redirect("/mfa");
}

const CreateFirmInput = SignupInput.pick({ firm_name: true, full_name: true });

/** For a signed-in user who has no firm yet. */
export async function createFirmForCurrentUser(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (process.env.ALLOW_FIRM_SIGNUP !== "true") return fail("New firm sign-up is turned off. Ask your firm's Owner for a login.");
  const parsed = CreateFirmInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the form.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_firm", { p_firm_name: parsed.data.firm_name, p_full_name: parsed.data.full_name });
  if (error) return fail(error.message);
  redirect("/mfa");
}
