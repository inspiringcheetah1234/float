"use client";

import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { searchClients, type ClientHit } from "@/server/actions/search";
import { clientTypeLabel } from "@/lib/domain/labels";

/** Type-ahead picker for another client (used for relations). */
export function ClientPicker({ excludeId, onPick }: { excludeId?: string; onPick: (c: ClientHit) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ClientHit[]>([]);
  const [chosen, setChosen] = useState<ClientHit | null>(null);
  const [, start] = useTransition();
  useEffect(() => {
    if (chosen && q === chosen.name) return;
    const t = setTimeout(() => start(async () => setHits((await searchClients(q)).filter((h) => h.id !== excludeId))), 150);
    return () => clearTimeout(t);
  }, [q, excludeId, chosen]);
  return (
    <div className="relative">
      <Input value={q} onChange={(e) => { setQ(e.target.value); setChosen(null); }} placeholder="Search client by name, CNIC…" aria-label="Find client" />
      {!chosen && hits.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-sm hover:bg-accent"
                onClick={() => { setChosen(h); setQ(h.name); setHits([]); onPick(h); }}
              >
                {h.name} <span className="text-xs text-muted-foreground">{clientTypeLabel(h.client_type as never)}{h.cnic ? ` · ${h.cnic}` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
