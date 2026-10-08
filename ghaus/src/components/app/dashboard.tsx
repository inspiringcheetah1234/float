"use client";

import Link from "next/link";
import { AlertTriangleIcon, ShieldAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RETURN_STATUSES, type ReturnStatus } from "@/lib/domain/pipeline";
import { clientTypeLabel } from "@/lib/domain/labels";
import { formatDate } from "@/lib/domain/dates";
import { taxYearShort } from "@/lib/domain/tax-year";
import { DueBadge, Money, UserName } from "./format";
import { ReturnStatusBadge } from "./status";
import type { ReturnLite } from "@/server/queries/dashboard";
import type { PeriodicDue } from "@/lib/domain/deadlines";

export function StatTile({ label, value, href, tone, sub }: { label: string; value: React.ReactNode; href?: string; tone?: "danger" | "warning"; sub?: React.ReactNode }) {
  const body = (
    <div className={cn("rounded-lg border bg-card p-3 shadow-xs transition-colors", href && "hover:bg-muted/50")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("num mt-1 text-2xl font-semibold", tone === "danger" && "text-red-700 dark:text-red-400", tone === "warning" && "text-amber-700 dark:text-amber-400")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/** Single-series bar list: one hue, counts as text labels, no legend needed. */
export function StageBars({ returns, ty }: { returns: ReturnLite[]; ty: number }) {
  const counts = RETURN_STATUSES.map((s) => ({ ...s, n: returns.filter((r) => r.status === s.value).length }));
  const max = Math.max(1, ...counts.map((c) => c.n));
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Returns by stage</CardTitle>
          <CardDescription>{taxYearShort(ty)} filing season · {returns.length} returns</CardDescription>
        </div>
        <Link href="/season" className="text-xs hover:underline">Open board</Link>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-1.5" aria-label="Returns by stage">
          {counts.map((c) => (
            <li key={c.value} className="grid grid-cols-[10.5rem_1fr_2rem] items-center gap-2 text-sm" title={`${c.label}: ${c.n}`}>
              <span className="truncate text-muted-foreground">{c.label}</span>
              <span className="h-3 rounded-r bg-muted/60">
                {c.n > 0 && <span className="block h-3 rounded-r bg-primary" style={{ width: `${(c.n / max) * 100}%` }} />}
              </span>
              <span className="num text-right font-medium">{c.n}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function DeadlineList({ returns, periodic, emptyText, limit = 12 }: { returns: ReturnLite[]; periodic: (PeriodicDue & { clients: number })[]; emptyText: string; limit?: number }) {
  type Row = { key: string; due: string; node: React.ReactNode };
  const rows: Row[] = [
    ...returns.map((r) => ({
      key: r.id,
      due: r.due ?? "",
      node: (
        <>
          <Link href={`/clients/${r.client_id}?ty=${r.tax_year}`} className="font-medium hover:underline">{r.client_name}</Link>
          <span className="text-xs text-muted-foreground"> · {taxYearShort(r.tax_year)} return · {clientTypeLabel(r.client_type)} · <UserName id={r.assignee_id} /></span>
          <div className="mt-0.5"><ReturnStatusBadge status={r.status} /></div>
        </>
      ),
    })),
    ...periodic.map((p) => ({
      key: p.rule_id + p.period_start,
      due: p.due_date,
      node: (
        <>
          <span className="font-medium">{p.name}</span>
          <span className="text-xs text-muted-foreground">
            {" "}· period {formatDate(p.period_start)} to {formatDate(p.period_end)}
            {p.clients > 0 ? ` · ${p.clients} registered client${p.clients === 1 ? "" : "s"}` : ""}
            {p.reference ? ` · extended (${p.reference})` : ""}
          </span>
        </>
      ),
    })),
  ].sort((a, b) => a.due.localeCompare(b.due));
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="divide-y">
      {rows.slice(0, limit).map((r) => (
        <li key={r.key} className="flex items-start justify-between gap-3 py-2 text-sm">
          <div className="min-w-0">{r.node}</div>
          <div className="shrink-0 text-xs"><DueBadge due={r.due} /></div>
        </li>
      ))}
      {rows.length > limit && <li className="py-2 text-xs text-muted-foreground">+ {rows.length - limit} more</li>}
    </ul>
  );
}

export function WealthFlags({ rows }: { rows: ReturnLite[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No prepared individual returns have a gap above the threshold.</p>;
  return (
    <ul className="divide-y">
      {rows.slice(0, 8).map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
          <Link href={`/clients/${r.client_id}?ty=${r.tax_year}`} className="flex items-center gap-1.5 font-medium hover:underline">
            <AlertTriangleIcon className="size-3.5 text-amber-600" /> {r.client_name}
          </Link>
          <span className="text-xs">
            {r.wealth_gap > 0 ? "Unexplained increase " : "Unexplained decrease "}
            <Money value={Math.abs(r.wealth_gap)} className="font-medium" />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AtlRisk({ risk, inactive, riskDays }: { risk: (ReturnLite & { surcharge: number; overdue: boolean })[]; inactive: ReturnLite[]; riskDays?: number }) {
  const total = risk.reduce((s, r) => s + r.surcharge, 0);
  if (risk.length === 0 && inactive.length === 0) return <p className="text-sm text-muted-foreground">No clients at risk.</p>;
  return (
    <div className="grid gap-2">
      {risk.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {risk.length} unfiled return{risk.length === 1 ? "" : "s"} due{riskDays !== undefined ? ` within ${riskDays} days` : " soon"} or overdue. Restoring ATL after late filing would cost up to <Money value={total} className="font-medium text-foreground" /> in surcharges.
        </p>
      )}
      <ul className="divide-y">
        {risk.slice(0, 8).map((r) => (
          <li key={r.id} className="py-1.5 text-sm">
            <Link href={`/clients/${r.client_id}?ty=${r.tax_year}`} className="font-medium hover:underline">{r.client_name}</Link>
            <div className="flex flex-wrap items-center justify-between gap-x-2 text-xs text-muted-foreground">
              <DueBadge due={r.due} />
              <span>{clientTypeLabel(r.client_type)} surcharge <Money value={r.surcharge} /></span>
            </div>
          </li>
        ))}
      </ul>
      {inactive.length > 0 && (
        <div className="text-xs">
          <span className="mb-1 flex items-center gap-1 font-medium"><ShieldAlertIcon className="size-3.5 text-red-600" /> Not on ATL now</span>
          <div className="flex flex-wrap gap-1.5">
            {inactive.map((r) => (
              <Link key={r.id} href={`/clients/${r.client_id}?ty=${r.tax_year}`}>
                <Badge variant="danger">{r.client_name}</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function StatusCount({ status, n }: { status: ReturnStatus; n: number }) {
  return <span className="inline-flex items-center gap-1"><ReturnStatusBadge status={status} /> {n}</span>;
}
