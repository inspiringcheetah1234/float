"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useFirm } from "@/components/app/firm-context";

export function ClientFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { users } = useFirm();
  const [q, setQ] = useState(params.get("q") ?? "");

  function set(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.replace(`${pathname}?${next}`);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) set("q", q);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, CNIC, NTN, phone"
        className="w-full sm:w-72"
        aria-label="Search clients"
      />
      <NativeSelect className="w-auto" value={params.get("type") ?? ""} onChange={(e) => set("type", e.target.value)} aria-label="Client type">
        <option value="">All types</option>
        <option value="individual">Individuals</option>
        <option value="aop">AOPs</option>
        <option value="company">Companies</option>
      </NativeSelect>
      <NativeSelect className="w-auto" value={params.get("assignee") ?? ""} onChange={(e) => set("assignee", e.target.value)} aria-label="Team member">
        <option value="">Anyone</option>
        <option value="none">Unassigned</option>
        {users.filter((u) => u.is_active).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
      </NativeSelect>
      <NativeSelect className="w-auto" value={params.get("state") ?? "active"} onChange={(e) => set("state", e.target.value)} aria-label="Status">
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="all">Active and inactive</option>
        <option value="archived">Archived</option>
      </NativeSelect>
    </div>
  );
}
