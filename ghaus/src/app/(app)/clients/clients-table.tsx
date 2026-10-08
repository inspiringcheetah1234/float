"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/app/page-header";
import { UserName } from "@/components/app/format";
import { ReturnStatusBadge } from "@/components/app/status";
import { useAction } from "@/components/app/use-action";
import { useFirm } from "@/components/app/firm-context";
import { clientTypeLabel } from "@/lib/domain/labels";
import { taxYearShort } from "@/lib/domain/tax-year";
import { bulkReassignClients } from "@/server/actions/clients";
import type { Enums } from "@/types/db";

export interface ClientRow {
  id: string;
  name: string;
  client_type: Enums<"client_type">;
  cnic: string | null;
  ntn: string | null;
  phone: string | null;
  city: string | null;
  assignee_id: string | null;
  reviewer_id: string | null;
  is_active: boolean;
  season_status: Enums<"return_status"> | null;
}

export function ClientsTable({ rows, season, canEdit, canEditReturns }: { rows: ClientRow[]; season: number; canEdit: boolean; canEditReturns: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { users } = useFirm();
  const [assignee, setAssignee] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [alsoReturns, setAlsoReturns] = useState(true);
  const { run, pending, dialog } = useAction();

  if (rows.length === 0) return <EmptyState>No clients match these filters.</EmptyState>;

  const allSelected = selected.size === rows.length;
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <>
      {canEdit && selected.size > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 p-2 text-sm" data-testid="bulk-bar">
          <span className="font-medium">{selected.size} selected</span>
          <NativeSelect className="h-8 w-auto" value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="New assignee">
            <option value="">Assignee: no change</option>
            <option value="none">Assignee: unassign</option>
            {users.filter((u) => u.is_active).map((u) => <option key={u.id} value={u.id}>Assignee: {u.full_name}</option>)}
          </NativeSelect>
          <NativeSelect className="h-8 w-auto" value={reviewer} onChange={(e) => setReviewer(e.target.value)} aria-label="New reviewer">
            <option value="">Reviewer: no change</option>
            <option value="none">Reviewer: unassign</option>
            {users.filter((u) => u.is_active).map((u) => <option key={u.id} value={u.id}>Reviewer: {u.full_name}</option>)}
          </NativeSelect>
          {canEditReturns && (
            <label className="flex items-center gap-1.5">
              <Checkbox checked={alsoReturns} onChange={(e) => setAlsoReturns(e.target.checked)} />
              Also their unfiled {taxYearShort(season)} returns
            </label>
          )}
          <Button
            size="sm"
            disabled={pending || (!assignee && !reviewer)}
            onClick={() =>
              run(
                () =>
                  bulkReassignClients({
                    ids: [...selected],
                    assignee_id: assignee || undefined,
                    reviewer_id: reviewer || undefined,
                    also_tax_year: canEditReturns && alsoReturns ? season : null,
                  }),
                { success: "Reassigned", onSuccess: () => { setSelected(new Set()); setAssignee(""); setReviewer(""); } },
              )
            }
          >
            Reassign
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {canEdit && (
                <TableHead className="w-8">
                  <Checkbox
                    aria-label="Select all"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
                  />
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>CNIC / NTN</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>{taxYearShort(season)} return</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id} data-state={selected.has(c.id) ? "selected" : undefined}>
                {canEdit && (
                  <TableCell>
                    <Checkbox aria-label={`Select ${c.name}`} checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  <Link href={`/clients/${c.id}`} className="hover:underline">{c.name}</Link>
                  {!c.is_active && <Badge variant="outline" className="ml-2">Inactive</Badge>}
                </TableCell>
                <TableCell>{clientTypeLabel(c.client_type)}</TableCell>
                <TableCell className="num text-xs">{c.cnic ?? (c.ntn ? `NTN ${c.ntn}` : "–")}</TableCell>
                <TableCell className="num text-xs">{c.phone ?? "–"}</TableCell>
                <TableCell>{c.city ?? "–"}</TableCell>
                <TableCell><UserName id={c.assignee_id} /></TableCell>
                <TableCell><UserName id={c.reviewer_id} /></TableCell>
                <TableCell>{c.season_status ? <ReturnStatusBadge status={c.season_status} /> : <span className="text-xs text-muted-foreground">No record</span>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {dialog}
    </>
  );
}
