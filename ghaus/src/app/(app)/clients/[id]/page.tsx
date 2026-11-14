import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getFirm } from "@/server/queries/common";
import { ClientHeader } from "./client-header";
import { YearTabs } from "./year-tabs";
import { ProfilePanel } from "./profile-panel";
import { YearPanel } from "./year-panel";

export const metadata: Metadata = { title: "Client" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ClientPage({ params, searchParams }: PageProps<"/clients/[id]">) {
  const ctx = await requirePermission("clients");
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const canReturns = ctx.can("returns");

  const [{ data: client }, { data: registrations }, { data: relOut }, { data: relIn }, { data: years }, firm] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase.from("client_registrations").select("*").eq("client_id", id).is("deleted_at", null).order("authority"),
    supabase.from("client_relations").select("id, relation, notes, related:related_client_id(id, name, client_type)").eq("client_id", id).is("deleted_at", null),
    supabase.from("client_relations").select("id, relation, notes, client:client_id(id, name, client_type)").eq("related_client_id", id).is("deleted_at", null),
    canReturns
      ? supabase.from("client_tax_years").select("id, tax_year, return_status, atl_status, atl_last_checked_on").eq("client_id", id).is("deleted_at", null).order("tax_year", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; tax_year: number; return_status: string; atl_status: string; atl_last_checked_on: string | null }[] }),
    getFirm(),
  ]);
  if (!client) notFound();

  const tyParam = typeof sp.ty === "string" ? sp.ty : undefined;
  const yearList = years ?? [];
  const selected = tyParam === "profile" ? null : tyParam ? Number(tyParam) : (yearList[0]?.tax_year ?? null);
  const selectedYear = selected ? yearList.find((y) => y.tax_year === selected) ?? null : null;
  const latestAtl = yearList.find((y) => y.atl_status !== "unknown") ?? yearList[0] ?? null;

  const relations = [
    ...(relOut ?? []).map((r) => ({ id: r.id, relation: r.relation, direction: "out" as const, other: r.related, notes: r.notes })),
    ...(relIn ?? []).map((r) => ({ id: r.id, relation: r.relation, direction: "in" as const, other: r.client, notes: r.notes })),
  ].filter((r) => r.other);

  return (
    <div className="grid gap-4">
      <ClientHeader
        client={client}
        registrations={registrations ?? []}
        atlStatus={(latestAtl?.atl_status as never) ?? "unknown"}
        atlYear={latestAtl?.tax_year ?? null}
        atlCheckedOn={latestAtl?.atl_last_checked_on ?? null}
        canEdit={ctx.can("clients", "edit")}
      />
      <YearTabs
        clientId={id}
        years={yearList.map((y) => ({ tax_year: y.tax_year, return_status: y.return_status as never }))}
        selected={selected}
        canAddYear={ctx.can("returns", "edit") && !client.deleted_at}
        canReturns={canReturns}
      />
      {selected === null || !selectedYear ? (
        selected !== null && canReturns ? (
          <p className="text-sm text-muted-foreground">There is no TY{selected} record for this client yet. Add it with “Add tax year”.</p>
        ) : (
          <ProfilePanel clientId={id} client={client} registrations={registrations ?? []} relations={relations} canEdit={ctx.can("clients", "edit")} />
        )
      ) : (
        <YearPanel clientId={id} clientName={client.name} yearId={selectedYear.id} threshold={Number(firm.wealth_gap_threshold)} />
      )}
    </div>
  );
}
