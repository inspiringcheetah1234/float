"use client";

import Link from "next/link";
import { useTransition } from "react";
import { CheckIcon, LogOutIcon, UserCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setNumberFormat } from "@/server/actions/prefs";
import { signOut } from "@/server/actions/auth";
import type { NumberFormat } from "@/lib/domain/money";

export function UserMenu({ userName, roleName, numberFormat }: { userName: string; roleName: string; numberFormat: NumberFormat }) {
  const [, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5" data-testid="user-menu">
          <UserCircleIcon />
          <span className="hidden max-w-32 truncate sm:inline">{userName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="text-sm font-medium text-foreground">{userName}</div>
          <div className="text-xs">{roleName}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Number format</DropdownMenuLabel>
        {(["lakh", "international"] as const).map((f) => (
          <DropdownMenuItem key={f} onSelect={() => startTransition(async () => { await setNumberFormat(f); })}>
            <CheckIcon className={numberFormat === f ? "opacity-100" : "opacity-0"} />
            {f === "lakh" ? "Lakh / crore (12,34,567)" : "International (1,234,567)"}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications">All notifications</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => startTransition(async () => { await signOut(); })}>
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
