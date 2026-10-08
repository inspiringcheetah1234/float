"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, PlusIcon, UserIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { searchClients, type ClientHit } from "@/server/actions/search";
import { clientTypeLabel } from "@/lib/domain/labels";
import type { NavItem } from "./app-shell";

export function CommandPalette({
  open, onOpenChange, nav, canCreateClient,
}: { open: boolean; onOpenChange: (v: boolean) => void; nav: NavItem[]; canCreateClient: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ClientHit[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const q = query;
    const t = setTimeout(() => {
      startTransition(async () => {
        const results = q.trim().length >= 2 ? await searchClients(q) : [];
        setHits(results);
      });
    }, 150);
    return () => clearTimeout(t);
  }, [query, open]);

  function go(href: string) {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  }

  const q = query.trim().toLowerCase();
  const navMatches = nav.filter((n) => !q || n.label.toLowerCase().includes(q));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl" showClose={false}>
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command shouldFilter={false} className="[&_[cmdk-input-wrapper]]:h-12">
          <CommandInput placeholder="Client name, CNIC, NTN, phone… or a page" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{q.length >= 2 ? "No matching clients." : "Type at least 2 characters."}</CommandEmpty>
            {hits.length > 0 && (
              <CommandGroup heading="Clients">
                {hits.map((c) => (
                  <CommandItem key={c.id} value={`client-${c.id}`} onSelect={() => go(`/clients/${c.id}`)}>
                    <UserIcon />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{c.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {clientTypeLabel(c.client_type as never)}
                        {c.cnic ? ` · ${c.cnic}` : ""}
                        {c.ntn ? ` · NTN ${c.ntn}` : ""}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {canCreateClient && (!q || "new client".includes(q) || "add client".includes(q)) && (
              <CommandGroup heading="Actions">
                <CommandItem value="new-client" onSelect={() => go("/clients/new")}>
                  <PlusIcon /> New client
                </CommandItem>
              </CommandGroup>
            )}
            {navMatches.length > 0 && (
              <CommandGroup heading="Go to">
                {navMatches.map((n) => (
                  <CommandItem key={n.href} value={`nav-${n.href}`} onSelect={() => go(n.href)}>
                    <ArrowRightIcon /> {n.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
