"use client";

import Link from "next/link";
import { useState } from "react";
import { UndoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DueBadge, Money, UserName } from "@/components/app/format";
import { useAction } from "@/components/app/use-action";
import { useFirm } from "@/components/app/firm-context";
import { clientTypeLabel } from "@/lib/domain/labels";
import { formatDateTime } from "@/lib/domain/dates";
import { taxYearShort } from "@/lib/domain/tax-year";
import { sendBackReturn, signOffReturn } from "@/server/actions/returns";
import type { Enums } from "@/types/db";

export interface ReviewItem {
  id: string;
  client_id: string;
  client_name: string;
  client_type: Enums<"client_type">;
  tax_year: number;
  assignee_id: string | null;
  reviewer_id: string | null;
  due: string | null;
  updated_at: string;
  payable: number;
  signed_off: boolean;
  since: string | null;
}

export function ReviewList({ items }: { items: ReviewItem[] }) {
  const { userId, isOwner } = useFirm();
  const { run, pending, dialog } = useAction();
  const [back, setBack] = useState<ReviewItem | null>(null);
  const [note, setNote] = useState("");
  return (
    <>
      <ul className="divide-y rounded-md border bg-card">
        {items.map((r) => {
          const mayAct = r.reviewer_id === userId || isOwner;
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-3" data-testid="review-item">
              <div className="min-w-0 flex-1">
                <Link href={`/clients/${r.client_id}?ty=${r.tax_year}`} className="font-medium hover:underline">
                  {r.client_name} · {taxYearShort(r.tax_year)}
                </Link>
                <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span>{clientTypeLabel(r.client_type)}</span>
                  <span>Prepared by <UserName id={r.assignee_id} /></span>
                  <span>Reviewer <UserName id={r.reviewer_id} /></span>
                  {r.since && <span>Waiting since {formatDateTime(r.since)}</span>}
                  <span>{r.payable >= 0 ? "Payable" : "Refundable"} <Money value={Math.abs(r.payable)} /></span>
                </div>
              </div>
              <div className="text-xs"><DueBadge due={r.due} /></div>
              {mayAct && (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => setBack(r)}><UndoIcon /> Send back</Button>
                  <Button size="sm" disabled={pending}
                    onClick={() => run((tok) => signOffReturn(r.id, tok ?? r.updated_at, true), { success: `${r.client_name}: signed off and sent for client approval` })}>
                    Sign off &amp; send to client
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Dialog open={back !== null} onOpenChange={(o) => !o && setBack(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send back: {back?.client_name}</DialogTitle>
            <DialogDescription>The return goes back to In preparation and the preparer is notified.</DialogDescription>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="What needs fixing?" aria-label="Reason" />
          <DialogFooter>
            <Button disabled={pending} onClick={() => back && run((tok) => sendBackReturn(back.id, tok ?? back.updated_at, note), {
              success: "Sent back", onSuccess: () => { setBack(null); setNote(""); },
            })}>Send back</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
