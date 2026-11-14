"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode =
  | { kind: "loading" }
  | { kind: "verify"; factorId: string }
  | { kind: "enroll"; factorId: string; qr: string; secret: string }
  | { kind: "error"; message: string };

export function MfaForm({ required, email }: { required: boolean; email: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) return setMode({ kind: "error", message: error.message });
      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) return setMode({ kind: "verify", factorId: verified.id });
      // Clear abandoned enrolments so a fresh QR code can be issued.
      for (const f of data.all.filter((f) => f.factor_type === "totp" && f.status !== "verified")) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Ghaus & Company (${new Date().toISOString().slice(0, 10)})`,
        issuer: "Ghaus & Company",
      });
      if (enrollError) return setMode({ kind: "error", message: enrollError.message });
      setMode({ kind: "enroll", factorId: enrolled.id, qr: enrolled.totp.qr_code, secret: enrolled.totp.secret });
    })();
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode.kind !== "verify" && mode.kind !== "enroll") return;
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mode.factorId, code: code.replace(/\s/g, "") });
      if (error) {
        setError("That code didn't work. Check your authenticator app and try again.");
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-lg font-semibold">Two-factor authentication</h1>
        <p className="text-sm text-muted-foreground">
          {mode.kind === "enroll"
            ? required
              ? "Your role has access to sensitive data, so 2FA is required. Scan this code with Google Authenticator, Microsoft Authenticator or 1Password."
              : "Scan this code with your authenticator app."
            : `Enter the 6-digit code from your authenticator app for ${email}.`}
        </p>
      </div>
      {mode.kind === "loading" && <p className="text-sm text-muted-foreground">Loading…</p>}
      {mode.kind === "error" && <p role="alert" className="text-sm text-destructive">{mode.message}</p>}
      {mode.kind === "enroll" && (
        <div className="grid justify-items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mode.qr} alt="QR code for your authenticator app" className="size-44 rounded border bg-white p-2" />
          <p className="text-center text-xs text-muted-foreground">
            Can&apos;t scan? Enter this key: <code className="break-all font-mono" data-testid="totp-secret">{mode.secret}</code>
          </p>
        </div>
      )}
      {(mode.kind === "enroll" || mode.kind === "verify") && (
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              required
            />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending}>{pending ? "Verifying…" : "Verify"}</Button>
        </form>
      )}
      <form action={signOut}>
        <Button type="submit" variant="link" size="sm" className="px-0">Sign out</Button>
      </form>
    </div>
  );
}
