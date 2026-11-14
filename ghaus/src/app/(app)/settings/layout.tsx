import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { SettingsNav } from "./settings-nav";

export default async function SettingsLayout({ children }: LayoutProps<"/settings">) {
  const ctx = await requirePermission("settings");
  return (
    <>
      <PageHeader title="Settings" description={ctx.can("settings", "edit") ? undefined : "You can view settings but not change them."} />
      <div className="grid gap-6 md:grid-cols-[12rem_1fr]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
