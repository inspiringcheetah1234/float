import type { Metadata } from "next";
import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentTypesEditor } from "../editors";

export const metadata: Metadata = { title: "Document types" };

export default async function Page() {
  const ctx = await getContext();
  const supabase = await createClient();
  const { data } = await supabase.from("document_types").select("*").is("deleted_at", null).order("sort_order");
  return (
    <div className="grid gap-4">

      <Card>
        <CardHeader><div><CardTitle>Document types</CardTitle><CardDescription>Types offered when uploading documents.</CardDescription></div></CardHeader>
        <CardContent><DocumentTypesEditor rows={data ?? []} canEdit={ctx.can("settings", "edit")} /></CardContent>
      </Card>
    </div>
  );
}
