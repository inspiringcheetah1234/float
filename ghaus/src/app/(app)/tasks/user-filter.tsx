"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { useFirm } from "@/components/app/firm-context";

export function UserFilter({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { users, userId } = useFirm();
  return (
    <NativeSelect
      className="w-auto"
      value={value}
      aria-label="Whose tasks"
      onChange={(e) => {
        const next = new URLSearchParams(params);
        if (e.target.value === userId) next.delete("who");
        else next.set("who", e.target.value);
        router.replace(`${pathname}?${next}`);
      }}
    >
      <option value={userId}>My tasks</option>
      <option value="all">Everyone</option>
      <option value="unassigned">Unassigned</option>
      {users.filter((u) => u.is_active && u.id !== userId).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
    </NativeSelect>
  );
}
