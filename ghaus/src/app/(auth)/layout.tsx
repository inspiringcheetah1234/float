export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <div className="mb-6 text-center">
        <div className="text-xl font-semibold tracking-tight">Ghaus &amp; Company</div>
        <div className="text-xs text-muted-foreground">Tax advisors · Practice management</div>
      </div>
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">{children}</div>
      <p className="mt-6 max-w-sm text-center text-xs text-muted-foreground">
        Records and workflow only. Returns are filed on FBR&apos;s IRIS portal.
      </p>
    </div>
  );
}
