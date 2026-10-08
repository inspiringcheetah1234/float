"use client";

import { useState } from "react";
import { ArchiveIcon, ArchiveRestoreIcon, MailIcon, MapPinIcon, PencilIcon, PhoneIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LastEdited, UserName } from "@/components/app/format";
import { AtlBadge } from "@/components/app/status";
import { useAction } from "@/components/app/use-action";
import { clientTypeLabel } from "@/lib/domain/labels";
import { formatDate } from "@/lib/domain/dates";
import { setClientArchived } from "@/server/actions/clients";
import type { Enums, Tables } from "@/types/db";
import { ClientForm, type ClientFormValues } from "../client-form";

export function ClientHeader({
  client, registrations, atlStatus, atlYear, atlCheckedOn, canEdit,
}: {
  client: Tables<"clients">;
  registrations: Tables<"client_registrations">[];
  atlStatus: Enums<"atl_status">;
  atlYear: number | null;
  atlCheckedOn: string | null;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const { run, pending, dialog } = useAction();
  const archived = Boolean(client.deleted_at);

  const initial: ClientFormValues = {
    client_type: client.client_type,
    name: client.name,
    cnic: client.cnic ?? "",
    ntn: client.ntn ?? "",
    strn: client.strn ?? "",
    phone: client.phone ?? "",
    whatsapp: client.whatsapp ?? "",
    email: client.email ?? "",
    address: client.address ?? "",
    city: client.city ?? "",
    referred_by: client.referred_by ?? "",
    assignee_id: client.assignee_id,
    reviewer_id: client.reviewer_id,
    is_active: client.is_active,
    notes: client.notes ?? "",
  };

  const ids: [string, string | null][] = [
    ["CNIC", client.cnic],
    ["NTN", client.ntn],
    ["STRN", client.strn],
    ...registrations.map((r) => [r.authority === "other" ? "Prov." : r.authority, r.registration_no] as [string, string]),
  ];

  return (
    <div className="rounded-lg border bg-card p-4">
      {archived && (
        <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          This client is archived. Their records are kept; restore to work on them again.
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight" data-testid="client-name">{client.name}</h1>
            <Badge variant="secondary">{clientTypeLabel(client.client_type)}</Badge>
            <span title={atlYear ? `TY${atlYear}${atlCheckedOn ? `, checked ${formatDate(atlCheckedOn)}` : ""}` : undefined}>
              <AtlBadge status={atlStatus} />
            </span>
            {!client.is_active && <Badge variant="outline">Inactive</Badge>}
          </div>
          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {ids.filter(([, v]) => v).map(([k, v], i) => (
              <div key={`${k}-${i}`} className="flex gap-1.5">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="num font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {client.phone && <span className="flex items-center gap-1"><PhoneIcon className="size-3.5" />{client.phone}</span>}
            {client.whatsapp && client.whatsapp !== client.phone && <span>WhatsApp {client.whatsapp}</span>}
            {client.email && <span className="flex items-center gap-1"><MailIcon className="size-3.5" />{client.email}</span>}
            {client.city && <span className="flex items-center gap-1"><MapPinIcon className="size-3.5" />{client.city}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-4 text-sm">
            <div><div className="text-xs text-muted-foreground">Assignee</div><UserName id={client.assignee_id} /></div>
            <div><div className="text-xs text-muted-foreground">Reviewer</div><UserName id={client.reviewer_id} /></div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              {!archived && (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}><PencilIcon /> Edit</Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  if (!archived && !confirm(`Archive ${client.name}? Their records are kept and can be restored.`)) return;
                  run((t) => setClientArchived(client.id, t ?? client.updated_at, !archived), { success: archived ? "Client restored" : "Client archived" });
                }}
              >
                {archived ? <><ArchiveRestoreIcon /> Restore</> : <><ArchiveIcon /> Archive</>}
              </Button>
            </div>
          )}
          <LastEdited at={client.updated_at} by={client.updated_by} />
        </div>
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>Edit client</DialogTitle></DialogHeader>
          <ClientForm initial={initial} id={client.id} updatedAt={client.updated_at} onDone={() => setEditing(false)} />
        </DialogContent>
      </Dialog>
      {dialog}
    </div>
  );
}
