"use client";

import { useActionState } from "react";
import { createFirmForCurrentUser, signUpFirm } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm({ signedInEmail }: { signedInEmail: string | null }) {
  const [state, action, pending] = useActionState(signedInEmail ? createFirmForCurrentUser : signUpFirm, null);
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="firm_name">Firm name</Label>
        <Input id="firm_name" name="firm_name" required placeholder="Ghaus & Company" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="full_name">Your name</Label>
        <Input id="full_name" name="full_name" required />
      </div>
      {signedInEmail ? (
        <p className="text-sm text-muted-foreground">Signed in as {signedInEmail}</p>
      ) : (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
          </div>
        </>
      )}
      {state && !state.ok && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create firm"}</Button>
    </form>
  );
}
