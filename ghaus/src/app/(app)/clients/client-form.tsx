"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { UserSelect } from "@/components/app/inputs";
import { useAction } from "@/components/app/use-action";
import { CLIENT_TYPES } from "@/lib/domain/labels";
import { formatCnic, isValidCnic } from "@/lib/domain/cnic";
import { createClientRecord, updateClientRecord, type ClientInputValues } from "@/server/actions/clients";

export type ClientFormValues = {
  client_type: "individual" | "aop" | "company";
  name: string;
  cnic: string;
  ntn: string;
  strn: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  referred_by: string;
  assignee_id: string | null;
  reviewer_id: string | null;
  is_active: boolean;
  notes: string;
};

export const emptyClient: ClientFormValues = {
  client_type: "individual", name: "", cnic: "", ntn: "", strn: "", phone: "", whatsapp: "", email: "",
  address: "", city: "", referred_by: "", assignee_id: null, reviewer_id: null, is_active: true, notes: "",
};

function Field({ label, htmlFor, children, hint, className }: { label: string; htmlFor: string; children: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ClientForm({
  initial, id, updatedAt, onDone,
}: { initial: Partial<ClientFormValues>; id?: string; updatedAt?: string; onDone?: () => void }) {
  const router = useRouter();
  const [v, setV] = useState<ClientFormValues>({ ...emptyClient, ...initial });
  const { run, pending, dialog } = useAction();
  const set = <K extends keyof ClientFormValues>(k: K, val: ClientFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const cnicInvalid = v.cnic.trim() !== "" && !isValidCnic(formatCnic(v.cnic) ?? v.cnic);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: ClientInputValues = { ...v };
    if (id && updatedAt) {
      run((token) => updateClientRecord(id, token ?? updatedAt, payload), { success: "Client saved", onSuccess: () => onDone?.() });
    } else {
      run(() => createClientRecord(payload), {
        success: "Client created",
        onSuccess: (d) => router.push(`/clients/${d.id}`),
      });
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Type" htmlFor="client_type">
          <NativeSelect id="client_type" value={v.client_type} onChange={(e) => set("client_type", e.target.value as ClientFormValues["client_type"])}>
            {CLIENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Name" htmlFor="name" className="sm:col-span-2">
          <Input id="name" value={v.name} onChange={(e) => set("name", e.target.value)} required />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="CNIC" htmlFor="cnic" hint={cnicInvalid ? <span className="text-destructive">Format: 12345-1234567-1</span> : "12345-1234567-1"}>
          <Input
            id="cnic"
            className="num"
            value={v.cnic}
            aria-invalid={cnicInvalid || undefined}
            onChange={(e) => set("cnic", e.target.value)}
            onBlur={() => { const f = formatCnic(v.cnic); if (f) set("cnic", f); }}
            placeholder="35202-1234567-1"
          />
        </Field>
        <Field label="NTN" htmlFor="ntn">
          <Input id="ntn" className="num" value={v.ntn} onChange={(e) => set("ntn", e.target.value)} />
        </Field>
        <Field label="STRN" htmlFor="strn">
          <Input id="strn" className="num" value={v.strn} onChange={(e) => set("strn", e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" className="num" value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0300-1234567" />
        </Field>
        <Field label="WhatsApp" htmlFor="whatsapp">
          <Input id="whatsapp" className="num" value={v.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Address" htmlFor="address" className="sm:col-span-2">
          <Input id="address" value={v.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="City" htmlFor="city">
          <Input id="city" value={v.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Assignee" htmlFor="assignee_id">
          <UserSelect id="assignee_id" value={v.assignee_id} onChange={(x) => set("assignee_id", x)} />
        </Field>
        <Field label="Reviewer" htmlFor="reviewer_id">
          <UserSelect id="reviewer_id" value={v.reviewer_id} onChange={(x) => set("reviewer_id", x)} />
        </Field>
        <Field label="Referred by" htmlFor="referred_by">
          <Input id="referred_by" value={v.referred_by} onChange={(e) => set("referred_by", e.target.value)} />
        </Field>
      </div>
      <Field label="Notes" htmlFor="notes">
        <Textarea id="notes" value={v.notes} onChange={(e) => set("notes", e.target.value)} rows={3} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={v.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Active client
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || cnicInvalid}>{pending ? "Saving…" : id ? "Save changes" : "Create client"}</Button>
        {onDone && <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>}
      </div>
      {dialog}
    </form>
  );
}
