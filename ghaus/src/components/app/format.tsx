"use client";

import { formatPKR, formatPKRCompact } from "@/lib/domain/money";
import { formatDate, formatDateTime, relativeDue } from "@/lib/domain/dates";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useFirm, useUserName } from "./firm-context";

export function Money({ value, compact, className }: { value: number | string | null | undefined; compact?: boolean; className?: string }) {
  const { numberFormat } = useFirm();
  const n = Number(value ?? 0);
  return (
    <span className={cn("num", n < 0 && "text-red-700 dark:text-red-400", className)}>
      {compact ? formatPKRCompact(n, numberFormat) : formatPKR(n, numberFormat)}
    </span>
  );
}

export function DateText({ value, withTime }: { value: string | null | undefined; withTime?: boolean }) {
  return <span className="num">{withTime ? formatDateTime(value) : formatDate(value)}</span>;
}

/** Due date with a coloured relative badge (overdue red, ≤7 days amber). */
export function DueBadge({ due, done }: { due: string | null | undefined; done?: boolean }) {
  const { today } = useFirm();
  if (!due) return <span className="text-muted-foreground">–</span>;
  const rel = relativeDue(due, today);
  const overdue = !done && due < today;
  const soon = !done && !overdue && rel !== "" && (rel === "due today" || rel === "due tomorrow" || /^in [2-7] days$/.test(rel));
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="num">{formatDate(due)}</span>
      {!done && (overdue || soon) && <Badge variant={overdue ? "danger" : "warning"}>{rel}</Badge>}
    </span>
  );
}

export function UserName({ id }: { id: string | null | undefined }) {
  const name = useUserName();
  return <span className={cn(!id && "text-muted-foreground")}>{name(id)}</span>;
}

export function Initials({ id }: { id: string | null | undefined }) {
  const name = useUserName()(id);
  if (!id) return <span className="text-xs text-muted-foreground">–</span>;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <span title={name} className="inline-flex size-6 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
      {initials}
    </span>
  );
}

export function LastEdited({ at, by }: { at: string | null | undefined; by: string | null | undefined }) {
  const name = useUserName();
  if (!at) return null;
  return (
    <span className="text-xs text-muted-foreground" data-testid="last-edited">
      Last edited by {by ? name(by) : "system"} · {formatDateTime(at)}
    </span>
  );
}
