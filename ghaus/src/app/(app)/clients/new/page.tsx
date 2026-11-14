import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "New client" };

export default async function NewClientPage() {
  const ctx = await requirePermission("clients", "edit");
  return (
    <div className="max-w-3xl">
      <PageHeader title="New client" />
      <div className="rounded-lg border bg-card p-4">
        <ClientForm initial={{ assignee_id: ctx.userId }} />
      </div>
    </div>
  );
}
