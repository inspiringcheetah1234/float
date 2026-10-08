"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { KanbanSquareIcon, ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { useFirm } from "@/components/app/firm-context";
import { taxYearLabel } from "@/lib/domain/tax-year";

export function SeasonFilters({ years, ty }: { years: number[]; ty: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { users } = useFirm();
  const active = users.filter((u) => u.is_active);
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next}`);
  };
  const view = params.get("view") === "list" ? "list" : "board";
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <NativeSelect className="w-auto" value={ty} onChange={(e) => set("ty", e.target.value)} aria-label="Tax year">
        {years.map((y) => <option key={y} value={y}>{taxYearLabel(y)}</option>)}
      </NativeSelect>
      <NativeSelect className="w-auto" value={params.get("assignee") ?? ""} onChange={(e) => set("assignee", e.target.value)} aria-label="Assignee">
        <option value="">Any assignee</option>
        <option value="none">Unassigned</option>
        {active.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
      </NativeSelect>
      <NativeSelect className="w-auto" value={params.get("reviewer") ?? ""} onChange={(e) => set("reviewer", e.target.value)} aria-label="Reviewer">
        <option value="">Any reviewer</option>
        {active.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
      </NativeSelect>
      <NativeSelect className="w-auto" value={params.get("type") ?? ""} onChange={(e) => set("type", e.target.value)} aria-label="Client type">
        <option value="">All client types</option>
        <option value="individual">Individuals</option>
        <option value="aop">AOPs</option>
        <option value="company">Companies</option>
      </NativeSelect>
      <label className="flex items-center gap-1.5 text-sm">
        <Checkbox checked={params.get("overdue") === "1"} onChange={(e) => set("overdue", e.target.checked ? "1" : "")} />
        Overdue only
      </label>
      <div className="ml-auto flex rounded-md border p-0.5">
        <Button size="xs" variant={view === "board" ? "secondary" : "ghost"} onClick={() => set("view", "")}><KanbanSquareIcon /> Board</Button>
        <Button size="xs" variant={view === "list" ? "secondary" : "ghost"} onClick={() => set("view", "list")}><ListIcon /> List</Button>
      </div>
    </div>
  );
}
