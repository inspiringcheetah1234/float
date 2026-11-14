"use client";

import Link from "next/link";
import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { ClientPicker } from "@/components/app/client-picker";
import { useAction } from "@/components/app/use-action";
import { RELATIONS, clientTypeLabel } from "@/lib/domain/labels";
import { addRelation, removeRelation } from "@/server/actions/clients";
import type { Enums } from "@/types/db";

export interface RelationItem {
  id: string;
  relation: Enums<"relation_type">;
  direction: "in" | "out";
  other: { id: string; name: string; client_type: Enums<"client_type"> };
}

/** "out": other is the <relation> of this client. "in": this client is the <relation> of other. */
function describe(r: RelationItem) {
  const def = RELATIONS.find((x) => x.value === r.relation);
  return r.direction === "out" ? def?.label ?? r.relation : def?.inverse ?? r.relation;
}

export function RelationsEditor({ clientId, relations, canEdit }: { clientId: string; relations: RelationItem[]; canEdit: boolean }) {
  const [relation, setRelation] = useState<Enums<"relation_type">>("spouse");
  const [otherId, setOtherId] = useState<string | null>(null);
  const [pickerKey, setPickerKey] = useState(0);
  const { run, pending, dialog } = useAction();
  return (
    <div className="grid gap-3">
      {relations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No linked clients. Link family members, directors or partners so wealth and s.114C checks can include them.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {relations.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-28 text-muted-foreground">{describe(r)}</span>
              <Link href={`/clients/${r.other.id}`} className="flex-1 font-medium hover:underline">{r.other.name}</Link>
              <span className="text-xs text-muted-foreground">{clientTypeLabel(r.other.client_type)}</span>
              {canEdit && (
                <button aria-label="Remove link" className="opacity-60 hover:opacity-100" onClick={() => run(() => removeRelation(r.id, clientId))}>
                  <Trash2Icon className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <div className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
          <ClientPicker key={pickerKey} excludeId={clientId} onPick={(c) => setOtherId(c.id)} />
          <NativeSelect value={relation} onChange={(e) => setRelation(e.target.value as Enums<"relation_type">)} aria-label="Relation">
            {RELATIONS.map((r) => <option key={r.value} value={r.value}>is their {r.label.toLowerCase()}</option>)}
          </NativeSelect>
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            disabled={pending || !otherId}
            onClick={() =>
              otherId &&
              run(() => addRelation({ client_id: clientId, related_client_id: otherId, relation }), {
                success: "Linked",
                onSuccess: () => { setOtherId(null); setPickerKey((k) => k + 1); },
              })
            }
          >
            <PlusIcon /> Link
          </Button>
        </div>
      )}
      {dialog}
    </div>
  );
}
