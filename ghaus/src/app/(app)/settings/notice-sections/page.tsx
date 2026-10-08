import type { Metadata } from "next";
import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LawNote } from "@/components/app/page-header";
import { NoticeSectionsEditor } from "../editors";

export const metadata: Metadata = { title: "Notice sections" };

export default async function Page() {
  const ctx = await getContext();
  const supabase = await createClient();
  const { data } = await supabase.from("notice_sections").select("*").is("deleted_at", null).order("law").order("section");
  return (
    <div className="grid gap-4">
      <LawNote />
      <Card>
        <CardHeader><div><CardTitle>Notice sections</CardTitle><CardDescription>Plain-language library of notice sections with default reply windows.</CardDescription></div></CardHeader>
        <CardContent><NoticeSectionsEditor rows={data ?? []} canEdit={ctx.can("settings", "edit")} /></CardContent>
      </Card>
    </div>
  );
}
