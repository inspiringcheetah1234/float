import type { Metadata } from "next";
import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplatesEditor } from "../editors";

export const metadata: Metadata = { title: "Message templates" };

export default async function Page() {
  const ctx = await getContext();
  const supabase = await createClient();
  const { data } = await supabase.from("message_templates").select("*").is("deleted_at", null).order("name");
  return (
    <div className="grid gap-4">

      <Card>
        <CardHeader><div><CardTitle>Message templates</CardTitle><CardDescription>WhatsApp, email and SMS messages to clients.</CardDescription></div></CardHeader>
        <CardContent><TemplatesEditor rows={data ?? []} canEdit={ctx.can("settings", "edit")} /></CardContent>
      </Card>
    </div>
  );
}
