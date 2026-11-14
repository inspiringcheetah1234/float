import type { Metadata } from "next";
import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskRulesEditor } from "../editors";

export const metadata: Metadata = { title: "Pipeline task rules" };

export default async function Page() {
  const ctx = await getContext();
  const supabase = await createClient();
  const { data } = await supabase.from("pipeline_task_rules").select("*").is("deleted_at", null).order("entity").order("created_at");
  return (
    <div className="grid gap-4">

      <Card>
        <CardHeader><div><CardTitle>Pipeline task rules</CardTitle><CardDescription>Tasks created automatically when work moves through a pipeline.</CardDescription></div></CardHeader>
        <CardContent><TaskRulesEditor rows={data ?? []} canEdit={ctx.can("settings", "edit")} /></CardContent>
      </Card>
    </div>
  );
}
