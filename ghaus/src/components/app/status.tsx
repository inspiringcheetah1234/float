import { Badge } from "@/components/ui/badge";
import { returnStatusLabel, type ReturnStatus } from "@/lib/domain/pipeline";
import { ATL_LABELS } from "@/lib/domain/labels";
import type { Enums } from "@/types/db";

const RETURN_VARIANT: Record<ReturnStatus, "secondary" | "info" | "warning" | "success" | "outline"> = {
  not_started: "outline",
  documents_requested: "secondary",
  documents_received: "secondary",
  in_preparation: "info",
  under_review: "warning",
  sent_for_client_approval: "info",
  approved: "info",
  filed: "success",
  acknowledgment_uploaded: "success",
  closed: "secondary",
};

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  return <Badge variant={RETURN_VARIANT[status]}>{returnStatusLabel(status)}</Badge>;
}

export function AtlBadge({ status }: { status: Enums<"atl_status"> | null | undefined }) {
  const s = status ?? "unknown";
  return (
    <Badge variant={s === "active" ? "success" : s === "inactive" ? "danger" : "outline"} data-testid="atl-badge">
      {ATL_LABELS[s]}
    </Badge>
  );
}
