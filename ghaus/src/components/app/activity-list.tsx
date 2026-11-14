"use client";

import { describeActivity, type ActivityRow } from "@/lib/domain/activity";
import { formatDateTime } from "@/lib/domain/dates";
import { useUserName } from "./firm-context";
import { EmptyState } from "./page-header";

export interface ActivityItem extends ActivityRow {
  id: number;
  actor_id: string | null;
  at: string;
}

export function ActivityList({ items }: { items: ActivityItem[] }) {
  const name = useUserName();
  if (items.length === 0) return <EmptyState>No activity yet.</EmptyState>;
  return (
    <ol className="relative grid gap-3 border-l pl-4">
      {items.map((a) => (
        <li key={a.id} className="text-sm">
          <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full border-2 border-background bg-muted-foreground/50" />
          <span className="font-medium">{a.actor_id ? name(a.actor_id) : "System"}</span> {describeActivity(a)}
          <div className="text-xs text-muted-foreground">{formatDateTime(a.at)}</div>
        </li>
      ))}
    </ol>
  );
}
