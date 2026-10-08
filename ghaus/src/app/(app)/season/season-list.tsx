"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DueBadge, UserName } from "@/components/app/format";
import { ReturnStatusBadge } from "@/components/app/status";
import { EmptyState } from "@/components/app/page-header";
import { useAction } from "@/components/app/use-action";
import { useFirm } from "@/components/app/firm-context";
import { clientTypeLabel } from "@/lib/domain/labels";
import { returnRank } from "@/lib/domain/pipeline";
import { bulkReassignReturns } from "@/server/actions/returns";
import type { SeasonCard } from "./season-board";

export function SeasonList({ cards, canEdit }: { cards: SeasonCard[]; canEdit: boolean }) {
  const { users } = useFirm();
  const active = users.filter((u) => u.is_active);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignee, setAssignee] = useState("");
  const [reviewer, setReviewer] = useState("");
  const { run, pending, dialog } = useAction();
  if (cards.length === 0) return <EmptyState>No returns match these filters.</EmptyState>;
  const sorted = [...cards].sort((a, b) => returnRank(a.status) - returnRank(b.status) || a.client_name.localeCompare(b.client_name));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <>
      {canEdit && selected.size > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 p-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <NativeSelect className="h-8 w-auto" value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="New assignee">
            <option value="">Assignee: no change</option>
            <option value="none">Assignee: unassign</option>
            {active.map((u) => <option key={u.id} value={u.id}>Assignee: {u.full_name}</option>)}
          </NativeSelect>
          <NativeSelect className="h-8 w-auto" value={reviewer} onChange={(e) => setReviewer(e.target.value)} aria-label="New reviewer">
            <option value="">Reviewer: no change</option>
            <option value="none">Reviewer: unassign</option>
            {active.map((u) => <option key={u.id} value={u.id}>Reviewer: {u.full_name}</option>)}
          </NativeSelect>
          <Button size="sm" disabled={pending || (!assignee && !reviewer)}
            onClick={() => run(() => bulkReassignReturns({ ids: [...selected], assignee_id: assignee || undefined, reviewer_id: reviewer || undefined }), {
              success: "Reassigned", onSuccess: () => { setSelected(new Set()); setAssignee(""); setReviewer(""); },
            })}>
            Reassign
          </Button>
        </div>
      )}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {canEdit && (
                <TableHead className="w-8">
                  <Checkbox aria-label="Select all" checked={selected.size === cards.length}
                    onChange={() => setSelected(selected.size === cards.length ? new Set() : new Set(cards.map((c) => c.id)))} />
                </TableHead>
              )}
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Reviewer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c) => (
              <TableRow key={c.id}>
                {canEdit && <TableCell><Checkbox aria-label={`Select ${c.client_name}`} checked={selected.has(c.id)} onChange={() => toggle(c.id)} /></TableCell>}
                <TableCell className="font-medium"><Link className="hover:underline" href={`/clients/${c.client_id}`}>{c.client_name}</Link></TableCell>
                <TableCell>{clientTypeLabel(c.client_type)}</TableCell>
                <TableCell><ReturnStatusBadge status={c.status} /></TableCell>
                <TableCell><DueBadge due={c.due} done={returnRank(c.status) >= returnRank("filed")} /></TableCell>
                <TableCell><UserName id={c.assignee_id} /></TableCell>
                <TableCell><UserName id={c.reviewer_id} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {dialog}
    </>
  );
}
