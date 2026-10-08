"use client";

import Link from "next/link";
import { useState } from "react";
import { DndContext, PointerSensor, KeyboardSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { AlertTriangleIcon, CheckCircle2Icon, ShieldAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { DueBadge, Initials } from "@/components/app/format";
import { useAction } from "@/components/app/use-action";
import { cn } from "@/lib/utils";
import { clientTypeLabel } from "@/lib/domain/labels";
import { RETURN_STATUSES, needsSignOff, returnRank, type ReturnStatus } from "@/lib/domain/pipeline";
import { moveReturn } from "@/server/actions/returns";
import type { Enums } from "@/types/db";

export interface SeasonCard {
  id: string;
  client_id: string;
  client_name: string;
  client_type: Enums<"client_type">;
  status: ReturnStatus;
  assignee_id: string | null;
  reviewer_id: string | null;
  due: string | null;
  overdue: boolean;
  signed_off: boolean;
  gap_flag: boolean;
  atl_inactive: boolean;
  updated_at: string;
}

function Card({ card, dragging }: { card: SeasonCard; dragging?: boolean }) {
  const filed = returnRank(card.status) >= returnRank("filed");
  return (
    <div className={cn("rounded-md border bg-card p-2.5 text-sm shadow-xs", dragging && "opacity-60 ring-2 ring-primary", card.overdue && "border-red-300")}>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/clients/${card.client_id}`} className="font-medium leading-tight hover:underline" onPointerDown={(e) => e.stopPropagation()}>
          {card.client_name}
        </Link>
        <Initials id={card.assignee_id} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span>{clientTypeLabel(card.client_type)}</span>
        {card.signed_off && <CheckCircle2Icon className="size-3.5 text-emerald-600" aria-label="Signed off" />}
        {card.gap_flag && <Badge variant="warning" title="Wealth gap above threshold"><AlertTriangleIcon /> Gap</Badge>}
        {card.atl_inactive && <Badge variant="danger" title="Not on the Active Taxpayers List"><ShieldAlertIcon /> ATL</Badge>}
      </div>
      <div className="mt-1.5 text-xs"><DueBadge due={card.due} done={filed} /></div>
    </div>
  );
}

function DraggableCard({ card, canEdit }: { card: SeasonCard; canEdit: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id, disabled: !canEdit });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={cn(canEdit && "cursor-grab touch-none")} data-testid="season-card" data-client={card.client_name}>
      <Card card={card} dragging={isDragging} />
    </div>
  );
}

function Column({ status, label, cards, canEdit, gated }: { status: ReturnStatus; label: string; cards: SeasonCard[]; canEdit: boolean; gated: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn("flex w-60 shrink-0 flex-col rounded-lg bg-muted/60 p-2", isOver && "bg-primary/10 ring-2 ring-primary/40", isOver && gated && "bg-red-50 ring-red-300")}
      data-testid={`column-${status}`}
    >
      <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold">
        <span>{label}</span>
        <span className="rounded bg-background px-1.5 py-0.5 text-muted-foreground">{cards.length}</span>
      </div>
      <div className="flex min-h-24 flex-col gap-2">
        {cards.map((c) => <DraggableCard key={c.id} card={c} canEdit={canEdit} />)}
      </div>
    </div>
  );
}

export function SeasonBoard({ cards: initial, canEdit }: { cards: SeasonCard[]; canEdit: boolean }) {
  const [cards, setCards] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setCards(initial);
  }
  const [dragId, setDragId] = useState<string | null>(null);
  const { run, dialog } = useAction();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const dragged = cards.find((c) => c.id === dragId);

  function onDragEnd(e: DragEndEvent) {
    setDragId(null);
    const card = cards.find((c) => c.id === e.active.id);
    const to = e.over?.id as ReturnStatus | undefined;
    if (!card || !to || to === card.status) return;
    if (needsSignOff(card.status, to, card.signed_off)) {
      toast.error("Review sign-off required: the reviewer must sign off before this return moves past Under review.");
      return;
    }
    const before = cards;
    setCards(cards.map((c) => (c.id === card.id ? { ...c, status: to } : c)));
    run((tok) => moveReturn(card.id, tok ?? card.updated_at, to), { onError: () => setCards(before) });
  }

  return (
    <DndContext id="season-board" sensors={sensors} collisionDetection={pointerWithin} onDragStart={(e) => setDragId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setDragId(null)}>
      <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-4 md:-mx-6 md:px-6">
        {RETURN_STATUSES.map((s) => (
          <Column
            key={s.value}
            status={s.value}
            label={s.label}
            cards={cards.filter((c) => c.status === s.value)}
            canEdit={canEdit}
            gated={Boolean(dragged && needsSignOff(dragged.status, s.value, dragged.signed_off))}
          />
        ))}
      </div>
      {dialog}
    </DndContext>
  );
}
