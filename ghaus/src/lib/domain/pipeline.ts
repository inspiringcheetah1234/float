import type { Enums } from "@/types/db";

export type ReturnStatus = Enums<"return_status">;
export type NoticeStatus = Enums<"notice_status">;

export const RETURN_STATUSES: { value: ReturnStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "documents_requested", label: "Documents requested" },
  { value: "documents_received", label: "Documents received" },
  { value: "in_preparation", label: "In preparation" },
  { value: "under_review", label: "Under review" },
  { value: "sent_for_client_approval", label: "Sent for client approval" },
  { value: "approved", label: "Approved" },
  { value: "filed", label: "Filed" },
  { value: "acknowledgment_uploaded", label: "Acknowledgment uploaded" },
  { value: "closed", label: "Closed" },
];

export const NOTICE_STATUSES: { value: NoticeStatus; label: string }[] = [
  { value: "received", label: "Received" },
  { value: "reply_drafted", label: "Reply drafted" },
  { value: "under_review", label: "Under review" },
  { value: "submitted", label: "Submitted" },
  { value: "hearing", label: "Hearing" },
  { value: "order", label: "Order" },
  { value: "closed", label: "Closed" },
  { value: "appealed", label: "Appealed" },
];

export function returnStatusLabel(s: ReturnStatus): string {
  return RETURN_STATUSES.find((x) => x.value === s)?.label ?? s;
}

export function noticeStatusLabel(s: NoticeStatus): string {
  return NOTICE_STATUSES.find((x) => x.value === s)?.label ?? s;
}

export function returnRank(s: ReturnStatus): number {
  return RETURN_STATUSES.findIndex((x) => x.value === s);
}

/** Mirrors the database gate: moving to or past "Sent for client approval" needs reviewer sign-off. */
export function needsSignOff(from: ReturnStatus, to: ReturnStatus, signedOff: boolean): boolean {
  const gate = returnRank("sent_for_client_approval");
  return returnRank(to) >= gate && returnRank(from) < gate && !signedOff;
}

export function isFiled(s: ReturnStatus): boolean {
  return returnRank(s) >= returnRank("filed");
}

export function nextReturnStatus(s: ReturnStatus): ReturnStatus | null {
  const i = returnRank(s);
  return i >= 0 && i < RETURN_STATUSES.length - 1 ? RETURN_STATUSES[i + 1].value : null;
}

export function previousReturnStatus(s: ReturnStatus): ReturnStatus | null {
  const i = returnRank(s);
  return i > 0 ? RETURN_STATUSES[i - 1].value : null;
}
