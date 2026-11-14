import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-lg font-semibold">You don&apos;t have access to this page</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your role does not include this module. Ask the firm&apos;s Owner if you need it.</p>
      <Link href="/" className="mt-4 inline-block text-sm underline">Go to your landing page</Link>
    </div>
  );
}
