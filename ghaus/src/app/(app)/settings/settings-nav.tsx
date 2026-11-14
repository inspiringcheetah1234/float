"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  ["/settings/firm", "Firm"],
  ["/settings/users", "Users"],
  ["/settings/roles", "Roles & permissions"],
  ["/settings/deadlines", "Deadlines"],
  ["/settings/notice-sections", "Notice sections"],
  ["/settings/document-types", "Document types"],
  ["/settings/templates", "Message templates"],
  ["/settings/task-rules", "Pipeline task rules"],
] as const;

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Settings">
      {ITEMS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className={cn("shrink-0 rounded-md px-2.5 py-1.5 text-sm hover:bg-muted", pathname === href ? "bg-muted font-medium" : "text-muted-foreground")}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
