"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatAmount, parseAmount } from "@/lib/domain/money";
import { formatDate, parseDate } from "@/lib/domain/dates";
import { cn } from "@/lib/utils";
import { useFirm } from "./firm-context";

/** Rupee amount: shows grouped digits (lakh/crore or international), edits as plain numbers. */
export function AmountInput({
  value, onChange, className, allowNegative = false, ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange"> & { value: number; onChange: (v: number) => void; allowNegative?: boolean }) {
  const { numberFormat } = useFirm();
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);

  return (
    <Input
      {...props}
      inputMode="decimal"
      aria-invalid={invalid || undefined}
      className={cn("num text-right", className)}
      value={focused ? text : formatAmount(value, numberFormat, Number.isInteger(Number(value)) ? 0 : 2)}
      onFocus={(e) => {
        // Swap the grouped display for raw digits *now* and select them, so typing replaces
        // the amount instead of appending to it after React re-renders.
        const raw = value ? String(value) : "";
        e.currentTarget.value = raw;
        e.currentTarget.select();
        setText(raw);
        setFocused(true);
      }}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseAmount(e.target.value);
        const ok = n !== null && (allowNegative || n >= 0);
        setInvalid(!ok);
        if (ok) onChange(n);
      }}
      onBlur={() => { setFocused(false); setInvalid(false); }}
    />
  );
}

/** Date typed as DD-MM-YYYY; value is ISO (YYYY-MM-DD) or null. */
export function DateInput({
  value, onChange, className, ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange"> & { value: string | null; onChange: (v: string | null) => void }) {
  const [text, setText] = useState(value ? formatDate(value) : "");
  const [invalid, setInvalid] = useState(false);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    // The value changed from outside (e.g. a refresh): show it.
    setPrev(value);
    setText(value ? formatDate(value) : "");
  }
  return (
    <Input
      {...props}
      placeholder="DD-MM-YYYY"
      inputMode="numeric"
      aria-invalid={invalid || undefined}
      className={cn("num", className)}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        if (e.target.value.trim() === "") { setInvalid(false); onChange(null); return; }
        const iso = parseDate(e.target.value);
        setInvalid(!iso);
        if (iso) onChange(iso);
      }}
      onBlur={() => { if (!invalid && value) setText(formatDate(value)); }}
    />
  );
}

export function UserSelect({
  value, onChange, placeholder = "Unassigned", includeInactive = false, ...props
}: Omit<React.ComponentProps<"select">, "value" | "onChange"> & {
  value: string | null; onChange: (v: string | null) => void; placeholder?: string; includeInactive?: boolean;
}) {
  const { users } = useFirm();
  const options = users.filter((u) => u.is_active || includeInactive || u.id === value);
  return (
    <NativeSelect {...props} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{placeholder}</option>
      {options.map((u) => (
        <option key={u.id} value={u.id}>{u.full_name}{u.role_name ? ` (${u.role_name})` : ""}</option>
      ))}
    </NativeSelect>
  );
}
