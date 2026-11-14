import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create your firm" };

export default async function SignupPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    const { data: ctx } = await supabase.rpc("get_my_context");
    if (ctx) redirect("/");
  }
  const allowed = process.env.ALLOW_FIRM_SIGNUP === "true";

  if (!allowed) {
    return (
      <div className="grid gap-3 text-sm">
        <h1 className="text-lg font-semibold">No access yet</h1>
        <p className="text-muted-foreground">
          {data.user
            ? "Your login is not linked to a firm. Ask your firm's Owner to add you under Settings → Users."
            : "Ask your firm's Owner to create a login for you."}
        </p>
        <Link href="/login" className="underline">Back to sign in</Link>
      </div>
    );
  }
  return (
    <>
      <h1 className="mb-1 text-lg font-semibold">Create your firm</h1>
      <p className="mb-4 text-sm text-muted-foreground">You will be the Owner and must set up two-factor authentication next.</p>
      <SignupForm signedInEmail={data.user?.email ?? null} />
    </>
  );
}
