import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getFirmUsers } from "@/server/queries/common";
import { todayPK } from "@/lib/domain/dates";
import { FirmProvider } from "@/components/app/firm-context";
import { AppShell, type NavItem } from "@/components/app/app-shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ctx = await getContext();
  const supabase = await createClient();
  const [users, unread, reviewCount] = await Promise.all([
    getFirmUsers(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null).is("deleted_at", null),
    ctx.can("returns")
      ? (() => {
          let q = supabase
            .from("client_tax_years")
            .select("id", { count: "exact", head: true })
            .eq("return_status", "under_review")
            .is("deleted_at", null);
          if (!ctx.isOwner) q = q.eq("reviewer_id", ctx.userId);
          return q;
        })()
      : Promise.resolve({ count: 0 }),
  ]);

  const nav: NavItem[] = [
    ...(ctx.isOwner ? [{ href: "/today", label: "Today", icon: "sun" as const }] : []),
    { href: "/my-work", label: "My work", icon: "inbox" },
    ...(ctx.can("clients") ? [{ href: "/clients", label: "Clients", icon: "users" as const }] : []),
    ...(ctx.can("returns") ? [{ href: "/season", label: "Filing season", icon: "kanban" as const }] : []),
    ...(ctx.can("returns") ? [{ href: "/review", label: "Review queue", icon: "check" as const, count: reviewCount.count ?? 0 }] : []),
    { href: "/tasks", label: "Tasks", icon: "list" },
    ...(ctx.can("settings") || ctx.isOwner ? [{ href: "/settings", label: "Settings", icon: "settings" as const }] : []),
  ];

  return (
    <FirmProvider
      value={{
        userId: ctx.userId,
        isOwner: ctx.isOwner,
        numberFormat: ctx.numberFormat,
        today: todayPK(),
        users,
        permissions: ctx.member.permissions,
      }}
    >
      <AppShell
        nav={nav}
        firmName={ctx.member.firm_name}
        userName={ctx.member.full_name}
        roleName={ctx.member.role_name}
        unreadCount={unread.count ?? 0}
        numberFormat={ctx.numberFormat}
        canCreateClient={ctx.can("clients", "edit")}
      >
        {children}
      </AppShell>
    </FirmProvider>
  );
}
