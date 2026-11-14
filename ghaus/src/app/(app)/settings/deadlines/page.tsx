import type { Metadata } from "next";
import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LawNote } from "@/components/app/page-header";
import { DeadlineOverridesEditor, DeadlineRulesEditor } from "../editors";

export const metadata: Metadata = { title: "Deadlines" };

export default async function DeadlinesPage() {
  const ctx = await getContext();
  const supabase = await createClient();
  const [{ data: rules }, { data: overrides }] = await Promise.all([
    supabase.from("deadline_rules").select("*").is("deleted_at", null).order("kind").order("name"),
    supabase.from("deadline_overrides").select("*").is("deleted_at", null).order("due_date", { ascending: false }),
  ]);
  const canEdit = ctx.can("settings", "edit");
  return (
    <div className="grid gap-4">
      <LawNote />
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Deadline rules</CardTitle>
            <CardDescription>Every due date in the app is computed from these. FBR changes dates often: edit here, never in code.</CardDescription>
          </div>
        </CardHeader>
        <CardContent><DeadlineRulesEditor rows={rules ?? []} canEdit={canEdit} /></CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Extensions</CardTitle>
            <CardDescription>One entry moves the due date for every affected client. The latest entry wins.</CardDescription>
          </div>
        </CardHeader>
        <CardContent><DeadlineOverridesEditor rows={overrides ?? []} rules={rules ?? []} canEdit={canEdit} /></CardContent>
      </Card>
    </div>
  );
}
