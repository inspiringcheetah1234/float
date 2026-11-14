"use client";

import { useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AmountInput } from "@/components/app/inputs";
import { Money } from "@/components/app/format";
import { useAction } from "@/components/app/use-action";
import { WEALTH_CATEGORIES, wealthCategoryLabel, type WealthCategory } from "@/lib/domain/wealth";
import { addWealthItem, removeWealthItem, updateWealthItem, type WealthItemValues } from "@/server/actions/returns";
import type { Tables } from "@/types/db";

type Item = Tables<"wealth_items">;

const blank: WealthItemValues = { category: "bank_balance", description: "", cost: 0, is_cash_equivalent: true };

export function WealthStatement({ yearId, items, canEdit }: { yearId: string; items: Item[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<{ item: Item | null; values: WealthItemValues } | null>(null);
  const { run, pending, dialog } = useAction();

  const order = WEALTH_CATEGORIES.map((c) => c.value);
  const sorted = [...items].sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
  const assets = items.filter((i) => i.category !== "liabilities").reduce((s, i) => s + Number(i.cost), 0);
  const liabilities = items.filter((i) => i.category === "liabilities").reduce((s, i) => s + Number(i.cost), 0);
  const cash = items.filter((i) => i.category !== "liabilities" && i.is_cash_equivalent).reduce((s, i) => s + Number(i.cost), 0);

  function save() {
    if (!editing) return;
    const { item, values } = editing;
    run(
      (tok) => (item ? updateWealthItem(item.id, tok ?? item.updated_at, values) : addWealthItem(yearId, values)),
      { success: item ? "Line updated" : "Line added", onSuccess: () => setEditing(null) },
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Wealth statement</CardTitle>
          <CardDescription>Assets and liabilities at 30 June, at cost</CardDescription>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setEditing({ item: null, values: blank })}><PlusIcon /> Add line</Button>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lines yet. Closing net assets use the declared figure until lines are added.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Cash equivalent</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                {canEdit && <TableHead className="w-16" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-muted-foreground">{wealthCategoryLabel(i.category)}</TableCell>
                  <TableCell className="whitespace-normal">{i.description}</TableCell>
                  <TableCell className="text-center">{i.is_cash_equivalent ? "Yes" : ""}</TableCell>
                  <TableCell className="text-right">
                    {i.category === "liabilities" ? <span className="text-red-700 dark:text-red-400">(<Money value={i.cost} />)</span> : <Money value={i.cost} />}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <button className="mr-2 opacity-60 hover:opacity-100" aria-label="Edit line"
                        onClick={() => setEditing({ item: i, values: { category: i.category, description: i.description, cost: Number(i.cost), is_cash_equivalent: i.is_cash_equivalent } })}>
                        <PencilIcon className="size-3.5" />
                      </button>
                      <button className="opacity-60 hover:opacity-100" aria-label="Remove line"
                        onClick={() => confirm(`Remove "${i.description}"?`) && run((tok) => removeWealthItem(i.id, tok ?? i.updated_at), { success: "Line removed" })}>
                        <Trash2Icon className="size-3.5" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Total assets</TableCell>
                <TableCell className="text-right"><Money value={assets} /></TableCell>
                {canEdit && <TableCell />}
              </TableRow>
              <TableRow>
                <TableCell colSpan={3}>Less liabilities</TableCell>
                <TableCell className="text-right">(<Money value={liabilities} />)</TableCell>
                {canEdit && <TableCell />}
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} className="font-semibold">Net assets</TableCell>
                <TableCell className="text-right font-semibold" data-testid="net-assets"><Money value={assets - liabilities} /></TableCell>
                {canEdit && <TableCell />}
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">of which cash-equivalent</TableCell>
                <TableCell className="text-right text-muted-foreground"><Money value={cash} /></TableCell>
                {canEdit && <TableCell />}
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </CardContent>
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.item ? "Edit line" : "Add wealth statement line"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="w-cat">Category</Label>
                <NativeSelect
                  id="w-cat"
                  value={editing.values.category}
                  onChange={(e) => {
                    const category = e.target.value as WealthCategory;
                    const def = WEALTH_CATEGORIES.find((c) => c.value === category)!;
                    setEditing({ ...editing, values: { ...editing.values, category, is_cash_equivalent: def.cashEquivalent } });
                  }}
                >
                  {WEALTH_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </NativeSelect>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="w-desc">Description</Label>
                <Input id="w-desc" value={editing.values.description} placeholder="e.g. HBL current account 1234, Plot 12 DHA Phase 6"
                  onChange={(e) => setEditing({ ...editing, values: { ...editing.values, description: e.target.value } })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="w-cost">Cost (Rs)</Label>
                <AmountInput id="w-cost" value={Number(editing.values.cost)} onChange={(v) => setEditing({ ...editing, values: { ...editing.values, cost: v } })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={editing.values.is_cash_equivalent} disabled={editing.values.category === "liabilities"}
                  onChange={(e) => setEditing({ ...editing, values: { ...editing.values, is_cash_equivalent: e.target.checked } })} />
                Cash equivalent (counts towards the s.114C 130% test)
              </label>
            </div>
          )}
          <DialogFooter>
            <Button onClick={save} disabled={pending || !editing?.values.description.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </Card>
  );
}
