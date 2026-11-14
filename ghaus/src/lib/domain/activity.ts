import { RETURN_STATUSES } from "./pipeline";

const TABLE_LABELS: Record<string, string> = {
  clients: "client",
  client_registrations: "registration",
  client_relations: "relation",
  client_tax_years: "return",
  wealth_items: "wealth statement line",
  tasks: "task",
  comments: "comment",
  documents: "document",
  notices: "notice",
  appeals: "appeal",
  hearings: "hearing",
  fee_agreements: "fee agreement",
  invoices: "invoice",
  payments: "payment",
  credentials: "credential",
  users: "user",
  roles: "role",
  role_permissions: "permissions",
  firms: "firm settings",
  deadline_rules: "deadline rule",
  deadline_overrides: "deadline extension",
  notice_sections: "notice section",
  document_types: "document type",
  message_templates: "message template",
  pipeline_task_rules: "task rule",
};

const FIELD_LABELS: Record<string, string> = {
  return_status: "status",
  review_signed_off_at: "review sign-off",
  review_signed_off_by: "signed off by",
  assignee_id: "assignee",
  reviewer_id: "reviewer",
  income_salary: "salary income",
  income_property: "property income",
  income_business: "business income",
  income_capital_gains: "capital gains",
  income_other_sources: "other sources income",
  income_exempt: "exempt income",
  income_final_fixed: "final/fixed tax income",
  tax_withheld_paid: "tax withheld/paid",
  atl_status: "ATL status",
  atl_last_checked_on: "ATL checked on",
  is_cash_equivalent: "cash equivalent",
  deleted_at: "archived",
};

export function tableLabel(table: string): string {
  return TABLE_LABELS[table] ?? table.replace(/_/g, " ");
}

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_id$/, "").replace(/_/g, " ");
}

const statusLabel = (v: unknown) => RETURN_STATUSES.find((s) => s.value === v)?.label ?? String(v);

export interface ActivityRow {
  action: string;
  table_name: string;
  changed_fields: string[] | null;
  before: unknown;
  after: unknown;
}

/** One-line, human-readable summary, e.g. "moved return from Under review to Sent for client approval". */
export function describeActivity(row: ActivityRow): string {
  const label = tableLabel(row.table_name);
  const after = (row.after ?? {}) as Record<string, unknown>;
  const before = (row.before ?? {}) as Record<string, unknown>;
  const name = (after.name ?? after.title ?? after.description) as string | undefined;
  switch (row.action) {
    case "insert":
      return `added ${label}${name ? ` "${truncate(String(name))}"` : ""}`;
    case "delete":
      return `archived ${label}${name ? ` "${truncate(String(name))}"` : ""}`;
    case "restore":
      return `restored ${label}`;
    case "reveal":
      return `revealed ${label}`;
    case "export":
      return `exported ${label}`;
    case "update": {
      const fields = row.changed_fields ?? [];
      if (fields.includes("return_status")) {
        return `moved ${label} from ${statusLabel(before.return_status)} to ${statusLabel(after.return_status)}`;
      }
      if (fields.includes("review_signed_off_at") && after.review_signed_off_at) return `signed off the ${label}`;
      if (row.table_name === "tasks" && fields.includes("status")) return `marked task "${truncate(String(after.title ?? ""))}" ${String(after.status).replace("_", " ")}`;
      const shown = fields.filter((f) => !["review_signed_off_by", "completed_at", "deleted_by"].includes(f)).map(fieldLabel);
      return `updated ${label}${shown.length ? `: ${shown.slice(0, 5).join(", ")}${shown.length > 5 ? "…" : ""}` : ""}`;
    }
    default:
      return `${row.action} ${label}`;
  }
}

function truncate(s: string, n = 60) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
