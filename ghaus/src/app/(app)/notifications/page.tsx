import type { Metadata } from "next";
import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/app/page-header";
import { NotificationList } from "./notification-list";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await getContext();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, read_at, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <>
      <PageHeader title="Notifications" />
      {(data ?? []).length === 0 ? <EmptyState>No notifications.</EmptyState> : <NotificationList items={data ?? []} />}
    </>
  );
}
