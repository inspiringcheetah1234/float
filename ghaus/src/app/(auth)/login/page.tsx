import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="mb-4 text-lg font-semibold">Sign in</h1>
      <LoginForm next={typeof next === "string" ? next : undefined} />
      {process.env.ALLOW_FIRM_SIGNUP === "true" && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          New firm? <Link className="underline" href="/signup">Create an account</Link>
        </p>
      )}
    </>
  );
}
