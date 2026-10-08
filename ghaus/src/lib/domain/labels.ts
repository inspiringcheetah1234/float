import type { Enums } from "@/types/db";

export const CLIENT_TYPES: { value: Enums<"client_type">; label: string }[] = [
  { value: "individual", label: "Individual" },
  { value: "aop", label: "AOP" },
  { value: "company", label: "Company" },
];
export const clientTypeLabel = (t: Enums<"client_type">) => CLIENT_TYPES.find((x) => x.value === t)?.label ?? t;

export const MODULES: { value: Enums<"app_module">; label: string }[] = [
  { value: "clients", label: "Clients" },
  { value: "returns", label: "Returns" },
  { value: "notices", label: "Notices & litigation" },
  { value: "fees", label: "Fees" },
  { value: "vault", label: "Credentials vault" },
  { value: "settings", label: "Settings" },
];

export const RELATIONS: { value: Enums<"relation_type">; label: string; inverse: string }[] = [
  { value: "spouse", label: "Spouse", inverse: "Spouse" },
  { value: "parent", label: "Parent", inverse: "Child" },
  { value: "child", label: "Child", inverse: "Parent" },
  { value: "sibling", label: "Sibling", inverse: "Sibling" },
  { value: "director", label: "Director", inverse: "Director of" },
  { value: "partner", label: "Partner", inverse: "Partner in" },
  { value: "member", label: "Member", inverse: "Member of" },
  { value: "shareholder", label: "Shareholder", inverse: "Shareholder in" },
];

export const REGISTRATION_AUTHORITIES: Enums<"registration_authority">[] = ["PRA", "SRB", "KPRA", "BRA", "other"];

export const ATL_LABELS: Record<Enums<"atl_status">, string> = {
  unknown: "ATL unknown",
  active: "ATL active",
  inactive: "Not on ATL",
};

export const TAX_LAWS: { value: Enums<"tax_law">; label: string }[] = [
  { value: "ito_2001", label: "Income Tax Ordinance 2001" },
  { value: "sta_1990", label: "Sales Tax Act 1990" },
  { value: "provincial", label: "Provincial sales tax law" },
];

export const DEADLINE_KINDS: { value: Enums<"deadline_kind">; label: string }[] = [
  { value: "annual_return", label: "Annual return" },
  { value: "sales_tax_return", label: "Sales tax return" },
  { value: "withholding_statement", label: "Withholding statement" },
  { value: "appeal_limitation", label: "Appeal limitation" },
];

export const APPEAL_FORUMS: { value: Enums<"appeal_forum">; label: string }[] = [
  { value: "commissioner_appeals", label: "Commissioner (Appeals)" },
  { value: "atir", label: "ATIR" },
  { value: "high_court", label: "High Court" },
  { value: "supreme_court", label: "Supreme Court" },
];

export const TASK_STATUSES: { value: Enums<"task_status">; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];
