"use client";

import { createContext, useContext } from "react";
import type { NumberFormat } from "@/lib/domain/money";
import type { FirmUser } from "@/server/queries/common";

export interface FirmContextValue {
  userId: string;
  isOwner: boolean;
  numberFormat: NumberFormat;
  today: string;
  users: FirmUser[];
  permissions: Record<string, { view: boolean; edit: boolean }>;
}

const FirmContext = createContext<FirmContextValue | null>(null);

export function FirmProvider({ value, children }: { value: FirmContextValue; children: React.ReactNode }) {
  return <FirmContext.Provider value={value}>{children}</FirmContext.Provider>;
}

export function useFirm(): FirmContextValue {
  const v = useContext(FirmContext);
  if (!v) throw new Error("useFirm must be used inside FirmProvider");
  return v;
}

export function useCan() {
  const { isOwner, permissions } = useFirm();
  return (module: string, action: "view" | "edit" = "view") => isOwner || Boolean(permissions[module]?.[action]);
}

export function useUserName() {
  const { users } = useFirm();
  return (id: string | null | undefined) => (id ? users.find((u) => u.id === id)?.full_name ?? "Former user" : "Unassigned");
}
