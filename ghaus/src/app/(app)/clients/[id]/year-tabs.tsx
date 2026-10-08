"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { useFirm } from "@/components/app/firm-context";
import { useAction } from "@/components/app/use-action";
import { cn } from "@/lib/utils";
import { returnStatusLabel, type ReturnStatus } from "@/lib/domain/pipeline";
import { filingSeasonYear, taxYearLabel, taxYearOptions, taxYearShort } from "@/lib/domain/tax-year";
import { createTaxYear } from "@/server/actions/returns";

export function YearTabs({
  clientId, years, selected, canAddYear, canReturns,
}: {
  clientId: string;
  years: { tax_year: number; return_status: ReturnStatus }[];
  selected: number | null;
  canAddYear: boolean;
  canReturns: boolean;
}) {
  const { today } = useFirm();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const have = new Set(years.map((y) => y.tax_year));
  const options = taxYearOptions(today, 8).filter((y) => !have.has(y));
  const season = filingSeasonYear(today);
  const [ty, setTy] = useState<number>(options.includes(season) ? season : (options[0] ?? season));
  const { run, pending, dialog } = useAction();

  const tab = (href: string, active: boolean, children: React.ReactNode, title?: string) => (
    <Link
      key={href}
      href={href}
      title={title}
      className={cn(
        "flex shrink-0 flex-col rounded-md px-3 py-1.5 text-sm hover:bg-muted",
        active ? "bg-background font-medium shadow-sm ring-1 ring-border" : "text-muted-foreground",
      )}
    >
      {children}
    </Link>
  );

  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-muted/60 p-1" role="tablist" aria-label="Tax years">
      {tab(`/clients/${clientId}?ty=profile`, selected === null, "Profile")}
      {canReturns &&
        years.map((y) =>
          tab(
            `/clients/${clientId}?ty=${y.tax_year}`,
            selected === y.tax_year,
            <>
              <span>{taxYearShort(y.tax_year)}</span>
              <span className="text-[10px] leading-tight text-muted-foreground">{returnStatusLabel(y.return_status)}</span>
            </>,
            taxYearLabel(y.tax_year),
          ),
        )}
      {canAddYear && options.length > 0 && (
        <Button size="sm" variant="ghost" className="ml-1 shrink-0" onClick={() => setOpen(true)}>
          <PlusIcon /> Add tax year
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add tax year</DialogTitle>
            <DialogDescription>
              Opening wealth is carried forward from the previous year&apos;s closing net assets. Assignee and reviewer come from the client.
            </DialogDescription>
          </DialogHeader>
          <NativeSelect value={ty} onChange={(e) => setTy(Number(e.target.value))} aria-label="Tax year">
            {options.map((y) => <option key={y} value={y}>{taxYearLabel(y)}</option>)}
          </NativeSelect>
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() =>
                run(() => createTaxYear({ client_id: clientId, tax_year: ty }), {
                  success: `${taxYearShort(ty)} added`,
                  onSuccess: (d) => { setOpen(false); router.push(`/clients/${clientId}?ty=${d.tax_year}`); },
                })
              }
            >
              Add {taxYearShort(ty)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </div>
  );
}
