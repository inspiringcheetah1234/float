"use client";

import { useState } from "react";
import { ArchiveIcon, PencilIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/app/inputs";
import { EmptyState } from "@/components/app/page-header";
import { useAction } from "@/components/app/use-action";
import { archiveLibraryRow, saveLibraryRow, type LibraryTable } from "@/server/actions/settings";

type Values = Record<string, unknown>;

export interface FieldSpec {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "checkbox" | "date" | "multi";
  options?: { value: string; label: string }[];
  /** Show only when this returns true for the current values */
  when?: (v: Values) => boolean;
  /** Options that depend on other values (e.g. statuses for the chosen entity) */
  optionsFor?: (v: Values) => { value: string; label: string }[];
  hint?: string;
  wide?: boolean;
}

export interface ColumnSpec {
  label: string;
  render: (row: Values) => React.ReactNode;
  className?: string;
}

export function LibraryEditor({
  table, rows, fields, columns, defaults, canEdit, addLabel = "Add", title = (r: Values) => String(r.name ?? r.title ?? ""),
}: {
  table: LibraryTable;
  rows: Values[];
  fields: FieldSpec[];
  columns: ColumnSpec[];
  defaults: Values;
  canEdit: boolean;
  addLabel?: string;
  title?: (r: Values) => string;
}) {
  const [editing, setEditing] = useState<{ id: string | null; updatedAt: string | null; values: Values } | null>(null);
  const { run, pending, dialog } = useAction();

  const open = (row: Values | null) =>
    setEditing(
      row
        ? { id: String(row.id), updatedAt: String(row.updated_at), values: Object.fromEntries(fields.map((f) => [f.name, row[f.name] ?? (f.type === "checkbox" ? false : f.type === "multi" ? [] : "")])) }
        : { id: null, updatedAt: null, values: { ...defaults } },
    );

  function save() {
    if (!editing) return;
    const values = Object.fromEntries(
      fields.filter((f) => !f.when || f.when(editing.values)).map((f) => [f.name, editing.values[f.name]]),
    );
    run((tok) => saveLibraryRow(table, editing.id, tok ?? editing.updatedAt, values), {
      success: "Saved",
      onSuccess: () => setEditing(null),
    });
  }

  const set = (name: string, value: unknown) => setEditing((e) => (e ? { ...e, values: { ...e.values, [name]: value } } : e));

  return (
    <div className="grid gap-3">
      {canEdit && (
        <div><Button size="sm" onClick={() => open(null)}><PlusIcon /> {addLabel}</Button></div>
      )}
      {rows.length === 0 ? (
        <EmptyState>Nothing here yet.</EmptyState>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => <TableHead key={c.label} className={c.className}>{c.label}</TableHead>)}
                {canEdit && <TableHead className="w-20" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={String(r.id)} className={r.is_active === false ? "opacity-60" : undefined}>
                  {columns.map((c) => <TableCell key={c.label} className={c.className}>{c.render(r)}</TableCell>)}
                  {canEdit && (
                    <TableCell className="text-right">
                      <button className="mr-3 opacity-60 hover:opacity-100" aria-label={`Edit ${title(r)}`} onClick={() => open(r)}>
                        <PencilIcon className="size-3.5" />
                      </button>
                      <button
                        className="opacity-60 hover:opacity-100"
                        aria-label={`Archive ${title(r)}`}
                        onClick={() => confirm(`Archive "${title(r)}"? It is kept in the audit log.`) && run((tok) => archiveLibraryRow(table, String(r.id), tok ?? String(r.updated_at)), { success: "Archived" })}
                      >
                        <ArchiveIcon className="size-3.5" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : addLabel}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.filter((f) => !f.when || f.when(editing.values)).map((f) => {
                const id = `f-${f.name}`;
                const v = editing.values[f.name];
                const opts = f.optionsFor ? f.optionsFor(editing.values) : f.options ?? [];
                return (
                  <div key={f.name} className={`grid gap-1.5 ${f.wide || f.type === "textarea" ? "sm:col-span-2" : ""}`}>
                    {f.type === "checkbox" ? (
                      <label className="flex items-center gap-2 pt-5 text-sm">
                        <Checkbox checked={Boolean(v)} onChange={(e) => set(f.name, e.target.checked)} /> {f.label}
                      </label>
                    ) : (
                      <>
                        <Label htmlFor={id}>{f.label}</Label>
                        {f.type === "text" && <Input id={id} value={String(v ?? "")} onChange={(e) => set(f.name, e.target.value)} />}
                        {f.type === "number" && <Input id={id} type="number" className="num" value={v === null || v === undefined ? "" : String(v)} onChange={(e) => set(f.name, e.target.value)} />}
                        {f.type === "textarea" && <Textarea id={id} rows={4} value={String(v ?? "")} onChange={(e) => set(f.name, e.target.value)} />}
                        {f.type === "date" && <DateInput id={id} value={(v as string) || null} onChange={(x) => set(f.name, x ?? "")} />}
                        {f.type === "select" && (
                          <NativeSelect id={id} value={String(v ?? "")} onChange={(e) => set(f.name, e.target.value)}>
                            {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </NativeSelect>
                        )}
                        {f.type === "multi" && (
                          <div className="flex flex-wrap gap-3 pt-1">
                            {opts.map((o) => {
                              const arr = Array.isArray(v) ? (v as string[]) : [];
                              return (
                                <label key={o.value} className="flex items-center gap-1.5 text-sm">
                                  <Checkbox checked={arr.includes(o.value)} onChange={(e) => set(f.name, e.target.checked ? [...arr, o.value] : arr.filter((x) => x !== o.value))} />
                                  {o.label}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                    {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter><Button onClick={save} disabled={pending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </div>
  );
}

export function ActiveBadge({ active }: { active: unknown }) {
  return active === false ? <Badge variant="outline">Inactive</Badge> : null;
}
