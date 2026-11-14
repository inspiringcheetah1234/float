"use client";

import { PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/app/use-action";
import { taxYearShort } from "@/lib/domain/tax-year";
import { startSeason } from "@/server/actions/returns";

export function StartSeasonButton({ taxYear, missing }: { taxYear: number; missing: number }) {
  const { run, pending, dialog } = useAction();
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          confirm(`Create ${taxYearShort(taxYear)} records for ${missing} active client(s) that don't have one yet?`) &&
          run(() => startSeason(taxYear), { success: `${taxYearShort(taxYear)} records created` })
        }
      >
        <PlayIcon /> Add {missing} missing {taxYearShort(taxYear)} {missing === 1 ? "record" : "records"}
      </Button>
      {dialog}
    </>
  );
}
