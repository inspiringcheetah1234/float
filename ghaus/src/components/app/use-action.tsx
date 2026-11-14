"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ActionResult, Conflict } from "@/server/actions/_lib";
import { formatDateTime } from "@/lib/domain/dates";

interface RunOptions<T> {
  success?: string;
  onSuccess?: (data: T) => void;
  onError?: (message: string) => void;
}

interface PendingConflict {
  conflict: Conflict;
  message: string;
  retry: (token: string) => void;
}

/**
 * Runs a Server Action with toasts, refresh and the optimistic-lock conflict prompt.
 * `fn` receives an override lock token when the user chooses to overwrite after a conflict.
 */
export function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [conflict, setConflict] = useState<PendingConflict | null>(null);

  function run<T>(fn: (overrideToken?: string) => Promise<ActionResult<T>>, opts: RunOptions<T> = {}) {
    startTransition(async () => {
      const res = await fn();
      handle(res, fn, opts);
    });
  }

  function handle<T>(res: ActionResult<T>, fn: (overrideToken?: string) => Promise<ActionResult<T>>, opts: RunOptions<T>) {
    if (res.ok) {
      if (opts.success) toast.success(opts.success);
      opts.onSuccess?.(res.data);
      router.refresh();
    } else if (res.conflict) {
      setConflict({
        conflict: res.conflict,
        message: res.error,
        retry: (token) =>
          startTransition(async () => {
            const again = await fn(token);
            handle(again, fn, opts);
          }),
      });
    } else {
      toast.error(res.error);
      opts.onError?.(res.error);
    }
  }

  const dialog = (
    <Dialog open={conflict !== null} onOpenChange={(o) => !o && setConflict(null)}>
      <DialogContent data-testid="conflict-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="size-4 text-amber-600" /> This record was changed by someone else
          </DialogTitle>
          <DialogDescription>
            {conflict?.message} {conflict && <>Their change was saved at {formatDateTime(conflict.conflict.updatedAt)}.</>}{" "}
            Reload to see their version (your unsaved edits will be lost), or overwrite it with yours.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              const c = conflict;
              setConflict(null);
              if (c) c.retry(c.conflict.updatedAt);
            }}
          >
            Overwrite with mine
          </Button>
          <Button
            onClick={() => {
              setConflict(null);
              router.refresh();
              // Remount forms with the latest data.
              setTimeout(() => window.location.reload(), 50);
            }}
          >
            Reload latest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { run, pending, dialog };
}
