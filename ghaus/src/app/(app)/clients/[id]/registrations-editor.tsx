"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { DateInput } from "@/components/app/inputs";
import { DateText } from "@/components/app/format";
import { useAction } from "@/components/app/use-action";
import { REGISTRATION_AUTHORITIES } from "@/lib/domain/labels";
import { addRegistration, removeRegistration } from "@/server/actions/clients";
import type { Tables } from "@/types/db";

export function RegistrationsEditor({ clientId, registrations, canEdit }: { clientId: string; registrations: Tables<"client_registrations">[]; canEdit: boolean }) {
  const [authority, setAuthority] = useState<(typeof REGISTRATION_AUTHORITIES)[number]>("PRA");
  const [no, setNo] = useState("");
  const [on, setOn] = useState<string | null>(null);
  const { run, pending, dialog } = useAction();
  return (
    <div className="grid gap-3">
      {registrations.length === 0 ? (
        <p className="text-sm text-muted-foreground">None recorded.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {registrations.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-12 font-medium">{r.authority}</span>
              <span className="num flex-1">{r.registration_no}</span>
              {r.registered_on && <span className="text-xs text-muted-foreground">since <DateText value={r.registered_on} /></span>}
              {canEdit && (
                <button aria-label={`Remove ${r.authority} registration`} className="opacity-60 hover:opacity-100" onClick={() => run(() => removeRegistration(r.id, clientId))}>
                  <Trash2Icon className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <NativeSelect className="w-24" value={authority} onChange={(e) => setAuthority(e.target.value as typeof authority)} aria-label="Authority">
            {REGISTRATION_AUTHORITIES.map((a) => <option key={a} value={a}>{a === "other" ? "Other" : a}</option>)}
          </NativeSelect>
          <Input className="w-44" placeholder="Registration no." value={no} onChange={(e) => setNo(e.target.value)} aria-label="Registration number" />
          <DateInput className="w-36" value={on} onChange={setOn} aria-label="Registered on" />
          <Button
            size="sm"
            variant="outline"
            disabled={pending || !no.trim()}
            onClick={() => run(() => addRegistration({ client_id: clientId, authority, registration_no: no, registered_on: on }), { onSuccess: () => { setNo(""); setOn(null); } })}
          >
            <PlusIcon /> Add
          </Button>
        </div>
      )}
      {dialog}
    </div>
  );
}
