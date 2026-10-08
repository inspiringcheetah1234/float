"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { AmountInput } from "@/components/app/inputs";
import { LastEdited } from "@/components/app/format";
import { LawNote } from "@/components/app/page-header";
import { useAction } from "@/components/app/use-action";
import { updateFirm, type FirmValues } from "@/server/actions/settings";
import type { Tables } from "@/types/db";

export function FirmForm({ firm, canEdit }: { firm: Tables<"firms">; canEdit: boolean }) {
  const [v, setV] = useState<FirmValues>({
    name: firm.name, ntn: firm.ntn ?? "", phone: firm.phone ?? "", email: firm.email ?? "", address: firm.address ?? "", city: firm.city ?? "",
    default_number_format: firm.default_number_format as "lakh" | "international",
    wealth_gap_threshold: Number(firm.wealth_gap_threshold),
    atl_surcharge_individual: Number(firm.atl_surcharge_individual),
    atl_surcharge_aop: Number(firm.atl_surcharge_aop),
    atl_surcharge_company: Number(firm.atl_surcharge_company),
    atl_risk_days: firm.atl_risk_days,
    s114c_enabled: firm.s114c_enabled,
    s114c_vehicle_threshold: Number(firm.s114c_vehicle_threshold),
    s114c_property_threshold: Number(firm.s114c_property_threshold),
    s114c_ratio: Number(firm.s114c_ratio),
  });
  const { run, pending, dialog } = useAction();
  const set = <K extends keyof FirmValues>(k: K, val: FirmValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const text = (k: "name" | "ntn" | "phone" | "email" | "address" | "city", label: string) => (
    <div className="grid gap-1.5">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} value={String(v[k] ?? "")} onChange={(e) => set(k, e.target.value)} disabled={!canEdit} />
    </div>
  );
  const money = (k: keyof FirmValues, label: string, hint?: string) => (
    <div className="grid gap-1.5">
      <Label htmlFor={k}>{label}</Label>
      <AmountInput id={k} value={Number(v[k])} onChange={(n) => set(k, n as never)} disabled={!canEdit} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => { e.preventDefault(); run((tok) => updateFirm(firm.id, tok ?? firm.updated_at, v), { success: "Firm settings saved" }); }}
    >
      <Card>
        <CardHeader><CardTitle>Firm</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {text("name", "Firm name")}
          {text("ntn", "NTN")}
          {text("phone", "Phone")}
          {text("email", "Email")}
          {text("address", "Address")}
          {text("city", "City")}
          <div className="grid gap-1.5">
            <Label htmlFor="fmt">Default number format</Label>
            <NativeSelect id="fmt" value={v.default_number_format} onChange={(e) => set("default_number_format", e.target.value as "lakh")} disabled={!canEdit}>
              <option value="lakh">Lakh / crore (12,34,567)</option>
              <option value="international">International (1,234,567)</option>
            </NativeSelect>
            <p className="text-xs text-muted-foreground">Each person can override this from their user menu.</p>
          </div>
        </CardContent>
      </Card>
      <LawNote />
      <Card>
        <CardHeader><div><CardTitle>Wealth reconciliation</CardTitle><CardDescription>Gaps larger than this (either way) are flagged</CardDescription></div></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">{money("wealth_gap_threshold", "Flag gaps above (Rs)")}</CardContent>
      </Card>
      <Card>
        <CardHeader><div><CardTitle>Active Taxpayers List</CardTitle><CardDescription>Surcharge to restore ATL status after filing late</CardDescription></div></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          {money("atl_surcharge_individual", "Individual")}
          {money("atl_surcharge_aop", "AOP")}
          {money("atl_surcharge_company", "Company")}
          <div className="grid gap-1.5">
            <Label htmlFor="risk">Warn this many days before the due date</Label>
            <Input id="risk" type="number" className="num" min={0} max={365} value={v.atl_risk_days} onChange={(e) => set("atl_risk_days", Number(e.target.value))} disabled={!canEdit} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Section 114C eligibility checker</CardTitle>
            <CardDescription>Enacted but not yet notified. Keep this off until it is.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <label className="flex items-center gap-2 text-sm sm:col-span-4">
            <Checkbox checked={v.s114c_enabled} onChange={(e) => set("s114c_enabled", e.target.checked)} disabled={!canEdit} /> Enable the s.114C checker (Phase 2)
          </label>
          {money("s114c_vehicle_threshold", "Vehicle threshold (Rs)")}
          {money("s114c_property_threshold", "Property threshold (Rs)")}
          <div className="grid gap-1.5">
            <Label htmlFor="ratio">Cash-equivalent ratio</Label>
            <Input id="ratio" type="number" step="0.01" className="num" value={v.s114c_ratio} onChange={(e) => set("s114c_ratio", Number(e.target.value))} disabled={!canEdit} />
            <p className="text-xs text-muted-foreground">1.30 = 130% of the transaction value</p>
          </div>
        </CardContent>
      </Card>
      {canEdit && (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save settings"}</Button>
          <LastEdited at={firm.updated_at} by={firm.updated_by} />
        </div>
      )}
      {dialog}
    </form>
  );
}
