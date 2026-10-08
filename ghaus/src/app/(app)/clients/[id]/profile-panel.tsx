import { createClient } from "@/lib/supabase/server";
import { getContext } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityList } from "@/components/app/activity-list";
import { CommentsPanel } from "@/components/app/comments-panel";
import type { Enums, Tables } from "@/types/db";
import { RegistrationsEditor } from "./registrations-editor";
import { RelationsEditor, type RelationItem } from "./relations-editor";

export async function ProfilePanel({
  clientId, client, registrations, relations, canEdit,
}: {
  clientId: string;
  client: Tables<"clients">;
  registrations: Tables<"client_registrations">[];
  relations: { id: string; relation: Enums<"relation_type">; direction: "in" | "out"; other: { id: string; name: string; client_type: Enums<"client_type"> } | null; notes: string | null }[];
  canEdit: boolean;
}) {
  const ctx = await getContext();
  const supabase = await createClient();
  const [{ data: comments }, { data: activity }] = await Promise.all([
    supabase.from("comments").select("id, body, mentions, created_by, created_at").eq("entity_type", "client").eq("entity_id", clientId).is("deleted_at", null).order("created_at"),
    supabase.from("activity_log").select("id, action, table_name, changed_fields, before, after, actor_id, at").eq("client_id", clientId).order("at", { ascending: false }).limit(60),
  ]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="grid content-start gap-4 lg:col-span-2">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">Address</dt><dd>{client.address ?? "–"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">City</dt><dd>{client.city ?? "–"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Referred by</dt><dd>{client.referred_by ?? "–"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">WhatsApp</dt><dd className="num">{client.whatsapp ?? "–"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Notes</dt><dd className="whitespace-pre-wrap">{client.notes ?? "–"}</dd></div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Provincial registrations</CardTitle></CardHeader>
          <CardContent><RegistrationsEditor clientId={clientId} registrations={registrations} canEdit={canEdit} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Family, directors and partners</CardTitle></CardHeader>
          <CardContent>
            <RelationsEditor clientId={clientId} relations={relations.filter((r) => r.other) as RelationItem[]} canEdit={canEdit} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Comments</CardTitle></CardHeader>
          <CardContent>
            <CommentsPanel entityType="client" entityId={clientId} clientId={clientId} comments={comments ?? []} canComment={ctx.can("clients")} />
          </CardContent>
        </Card>
      </div>
      <Card className="content-start">
        <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
        <CardContent><ActivityList items={activity ?? []} /></CardContent>
      </Card>
    </div>
  );
}
