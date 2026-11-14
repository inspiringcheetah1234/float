"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead, markNotificationRead } from "@/server/actions/notifications";
import { formatDateTime } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";

interface Item { id: string; kind: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }

export function NotificationList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = items.filter((i) => !i.read_at).length;
  return (
    <div className="grid gap-3">
      {unread > 0 && (
        <div>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => { await markAllNotificationsRead(); router.refresh(); })}>
            Mark all {unread} as read
          </Button>
        </div>
      )}
      <ul className="divide-y rounded-md border bg-card">
        {items.map((n) => (
          <li key={n.id}>
            <button
              className={cn("block w-full px-3 py-2.5 text-left hover:bg-muted/50", !n.read_at && "bg-primary/5")}
              onClick={() => start(async () => { if (!n.read_at) await markNotificationRead(n.id); if (n.link) router.push(n.link); else router.refresh(); })}
            >
              <div className="flex items-start gap-2">
                <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{n.title}</div>
                  {n.body && <div className="text-sm text-muted-foreground">{n.body}</div>}
                  <div className="text-xs text-muted-foreground">{formatDateTime(n.created_at)}</div>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
