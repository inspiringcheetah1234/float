"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CheckCheckIcon, InboxIcon, KanbanSquareIcon, ListTodoIcon, MenuIcon, SearchIcon, SettingsIcon, SunIcon, UsersIcon, XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "./command-palette";
import { NotificationsMenu } from "./notifications-menu";
import { UserMenu } from "./user-menu";
import type { NumberFormat } from "@/lib/domain/money";

const ICONS = {
  sun: SunIcon,
  inbox: InboxIcon,
  users: UsersIcon,
  kanban: KanbanSquareIcon,
  check: CheckCheckIcon,
  list: ListTodoIcon,
  settings: SettingsIcon,
};

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  count?: number;
}

export function AppShell({
  nav, firmName, userName, roleName, unreadCount, numberFormat, canCreateClient, children,
}: {
  nav: NavItem[];
  firmName: string;
  userName: string;
  roleName: string;
  unreadCount: number;
  numberFormat: NumberFormat;
  canCreateClient: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3" aria-label="Main">
      <div className="mb-4 px-2 pt-1">
        <div className="text-sm font-semibold leading-tight text-sidebar-foreground">{firmName}</div>
        <div className="text-[11px] text-sidebar-foreground/60">Practice management</div>
      </div>
      {nav.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              active && "bg-sidebar-accent font-medium text-sidebar-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="flex-1">{item.label}</span>
            {item.count ? (
              <span className="rounded bg-amber-400/90 px-1.5 text-[11px] font-semibold text-amber-950">{item.count}</span>
            ) : null}
          </Link>
        );
      })}
      <div className="mt-auto px-2 pb-1 text-[11px] leading-snug text-sidebar-foreground/50">
        Records &amp; workflow only.
        <br />
        Returns are filed on IRIS.
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-56 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
        <aside className="sticky top-0 h-screen">{sidebar}</aside>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-sidebar shadow-xl">
            <button className="absolute top-3 right-3 text-sidebar-foreground" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <XIcon className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur md:px-5">
          <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <MenuIcon />
          </Button>
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-8 min-w-0 max-w-md flex-1 items-center gap-2 rounded-md border bg-muted/40 px-2.5 text-left text-sm text-muted-foreground hover:bg-muted"
            data-testid="open-command-palette"
          >
            <SearchIcon className="size-4" />
            <span className="flex-1 truncate"><span className="sm:hidden">Search</span><span className="hidden sm:inline">Search clients by name, CNIC, NTN or phone…</span></span>
            <kbd className="hidden rounded border bg-background px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <NotificationsMenu unreadCount={unreadCount} />
            <UserMenu userName={userName} roleName={roleName} numberFormat={numberFormat} />
          </div>
        </header>
        <main className="min-w-0 flex-1 px-3 py-4 md:px-6 md:py-6">{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} nav={nav} canCreateClient={canCreateClient} />
    </div>
  );
}
