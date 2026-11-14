"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { markAllNotificationsRead, markNotificationRead, recentNotifications } from "@/server/actions/notifications";
import { formatDateTime } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";

type Item = Awaited<ReturnType<typeof recentNotifications>>[number];

export function NotificationsMenu({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [, startTransition] = useTransition();

  function onOpenChange(open: boolean) {
    if (open) startTransition(async () => setItems(await recentNotifications()));
  }

  function openItem(item: Item) {
    startTransition(async () => {
      if (!item.read_at) await markNotificationRead(item.id);
      if (item.link) router.push(item.link);
      router.refresh();
    });
  }

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative" aria-label={`Notifications (${unreadCount} unread)`} data-testid="notifications-bell">
          <BellIcon />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <button
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => startTransition(async () => { await markAllNotificationsRead(); setItems(await recentNotifications()); router.refresh(); })}
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items === null && <p className="p-3 text-sm text-muted-foreground">Loading…</p>}
          {items?.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nothing yet.</p>}
          {items?.map((n) => (
            <button
              key={n.id}
              onClick={() => openItem(n)}
              className={cn("block w-full border-b px-3 py-2 text-left last:border-0 hover:bg-muted/60", !n.read_at && "bg-primary/5")}
            >
              <div className="flex items-start gap-2">
                {!n.read_at && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}
                <div className="min-w-0">
                  <div className="text-sm font-medium">{n.title}</div>
                  {n.body && <div className="line-clamp-2 text-xs text-muted-foreground">{n.body}</div>}
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{formatDateTime(n.created_at)}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="border-t px-3 py-2 text-right">
          <Link href="/notifications" className="text-xs hover:underline">See all</Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
