"use client";

import { Badge } from "@/components/ui/badge";
import { DateText } from "@/components/app/format";
import { APPEAL_FORUMS, CLIENT_TYPES, DEADLINE_KINDS, TAX_LAWS } from "@/lib/domain/labels";
import { NOTICE_STATUSES, RETURN_STATUSES } from "@/lib/domain/pipeline";
import { ActiveBadge, LibraryEditor, type FieldSpec } from "./library-editor";

type Row = Record<string, unknown>;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const typesLabel = (v: unknown) =>
  Array.isArray(v) && v.length ? (v as string[]).map((t) => CLIENT_TYPES.find((c) => c.value === t)?.label ?? t).join(", ") : "All";

export function describeRule(r: Row): string {
  switch (r.kind) {
    case "annual_return":
      return `${r.due_day} ${MONTHS[Number(r.due_month) - 1]}${Number(r.year_offset) ? ` (+${r.year_offset} yr)` : ""} after the tax year ends (TY N → ${r.due_day} ${MONTHS[Number(r.due_month) - 1]} N${Number(r.year_offset) ? `+${r.year_offset}` : ""})`;
    case "sales_tax_return":
    case "withholding_statement":
      return `${r.period_months === 1 ? "Monthly" : r.period_months === 3 ? "Quarterly" : `Every ${r.period_months} months`}: day ${r.due_day} of the ${Number(r.month_offset) === 1 ? "month after" : `${r.month_offset}th month after`} the period ends`;
    case "appeal_limitation":
      return `${r.days_after} days from receipt of the order`;
    default:
      return "";
  }
}

const isKind = (...k: string[]) => (v: Row) => k.includes(String(v.kind));

export function DeadlineRulesEditor({ rows, canEdit }: { rows: Row[]; canEdit: boolean }) {
  const fields: FieldSpec[] = [
    { name: "name", label: "Name", type: "text", wide: true },
    { name: "kind", label: "Kind", type: "select", options: DEADLINE_KINDS },
    { name: "authority", label: "Authority", type: "text", hint: "FBR, PRA, SRB, KPRA, BRA", when: isKind("annual_return", "sales_tax_return", "withholding_statement") },
    { name: "client_types", label: "Applies to", type: "multi", options: CLIENT_TYPES, when: isKind("annual_return"), hint: "None ticked = all client types", wide: true },
    { name: "due_month", label: "Due month", type: "select", options: [{ value: "", label: "–" }, ...MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))], when: isKind("annual_return") },
    { name: "due_day", label: "Due day", type: "number", when: isKind("annual_return", "sales_tax_return", "withholding_statement") },
    { name: "year_offset", label: "Years after the tax year", type: "number", when: isKind("annual_return"), hint: "0 = same calendar year the tax year ends" },
    { name: "period_months", label: "Period", type: "select", options: [{ value: "1", label: "Monthly" }, { value: "3", label: "Quarterly" }, { value: "6", label: "Half-yearly" }, { value: "12", label: "Yearly" }], when: isKind("sales_tax_return", "withholding_statement") },
    { name: "month_offset", label: "Months after period end", type: "number", when: isKind("sales_tax_return", "withholding_statement"), hint: "1 = following month" },
    { name: "forum", label: "Forum", type: "select", options: [{ value: "", label: "–" }, ...APPEAL_FORUMS], when: isKind("appeal_limitation") },
    { name: "days_after", label: "Days from receipt of order", type: "number", when: isKind("appeal_limitation") },
    { name: "notes", label: "Notes / legal basis", type: "textarea" },
    { name: "is_active", label: "Active", type: "checkbox" },
  ];
  return (
    <LibraryEditor
      table="deadline_rules"
      rows={rows}
      canEdit={canEdit}
      addLabel="Add rule"
      fields={fields}
      defaults={{ name: "", kind: "sales_tax_return", authority: "", client_types: [], due_month: "", due_day: 18, year_offset: 0, period_months: "1", month_offset: 1, forum: "", days_after: "", notes: "", is_active: true }}
      columns={[
        { label: "Rule", render: (r) => <span className="font-medium whitespace-normal">{String(r.name)} <ActiveBadge active={r.is_active} /></span>, className: "whitespace-normal" },
        { label: "Applies to", render: (r) => (r.kind === "annual_return" ? typesLabel(r.client_types) : r.kind === "appeal_limitation" ? APPEAL_FORUMS.find((f) => f.value === r.forum)?.label : String(r.authority ?? "")) },
        { label: "When due", render: (r) => <span className="whitespace-normal text-muted-foreground">{describeRule(r)}</span>, className: "whitespace-normal" },
      ]}
    />
  );
}

export function DeadlineOverridesEditor({ rows, rules, canEdit }: { rows: Row[]; rules: Row[]; canEdit: boolean }) {
  const ruleKind = (id: unknown) => String(rules.find((r) => r.id === id)?.kind ?? "");
  const fields: FieldSpec[] = [
    { name: "rule_id", label: "Rule", type: "select", options: rules.map((r) => ({ value: String(r.id), label: String(r.name) })), wide: true },
    { name: "tax_year", label: "Tax year", type: "number", when: (v) => ruleKind(v.rule_id) === "annual_return", hint: "e.g. 2026 for TY2026" },
    { name: "period_start", label: "Period starting", type: "date", when: (v) => ruleKind(v.rule_id) !== "annual_return" && ruleKind(v.rule_id) !== "", hint: "First day of the month or quarter extended" },
    { name: "client_types", label: "Only for", type: "multi", options: CLIENT_TYPES, when: (v) => ruleKind(v.rule_id) === "annual_return", hint: "None ticked = every type the rule covers", wide: true },
    { name: "due_date", label: "New due date", type: "date" },
    { name: "reference", label: "Reference", type: "text", hint: "e.g. Circular 3 of 2026-27" },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
  return (
    <LibraryEditor
      table="deadline_overrides"
      rows={rows}
      canEdit={canEdit}
      addLabel="Add extension"
      title={(r) => String(r.reference)}
      fields={fields}
      defaults={{ rule_id: rules.find((r) => r.kind === "annual_return")?.id ?? "", tax_year: "", period_start: "", client_types: [], due_date: "", reference: "", notes: "" }}
      columns={[
        { label: "Rule", render: (r) => <span className="whitespace-normal">{String(rules.find((x) => x.id === r.rule_id)?.name ?? "")}</span>, className: "whitespace-normal" },
        { label: "Applies to", render: (r) => (r.tax_year ? `TY${r.tax_year} · ${typesLabel(r.client_types)}` : <>Period from <DateText value={r.period_start as string} /></>) },
        { label: "New due date", render: (r) => <span className="font-medium"><DateText value={r.due_date as string} /></span> },
        { label: "Reference", render: (r) => String(r.reference) },
      ]}
    />
  );
}

export function NoticeSectionsEditor({ rows, canEdit }: { rows: Row[]; canEdit: boolean }) {
  return (
    <LibraryEditor
      table="notice_sections"
      rows={rows}
      canEdit={canEdit}
      addLabel="Add section"
      title={(r) => `s.${r.section}`}
      fields={[
        { name: "law", label: "Law", type: "select", options: TAX_LAWS },
        { name: "section", label: "Section", type: "text", hint: "e.g. 122(5A)" },
        { name: "title", label: "Title", type: "text", wide: true },
        { name: "description", label: "Plain-language description", type: "textarea" },
        { name: "default_reply_days", label: "Default reply window (days)", type: "number" },
        { name: "is_active", label: "Active", type: "checkbox" },
        { name: "reply_template", label: "Reply template (used for AI drafting in Phase 4)", type: "textarea" },
      ]}
      defaults={{ law: "ito_2001", section: "", title: "", description: "", default_reply_days: 15, reply_template: "", is_active: true }}
      columns={[
        { label: "Law", render: (r) => (r.law === "ito_2001" ? "ITO 2001" : r.law === "sta_1990" ? "STA 1990" : "Provincial") },
        { label: "Section", render: (r) => <span className="font-medium">{String(r.section)}</span> },
        { label: "What it is", render: (r) => <div className="max-w-xl whitespace-normal"><div className="font-medium">{String(r.title)} <ActiveBadge active={r.is_active} /></div><div className="text-xs text-muted-foreground">{String(r.description ?? "")}</div></div>, className: "whitespace-normal" },
        { label: "Reply window", render: (r) => `${r.default_reply_days} days` },
      ]}
    />
  );
}

export function DocumentTypesEditor({ rows, canEdit }: { rows: Row[]; canEdit: boolean }) {
  return (
    <LibraryEditor
      table="document_types"
      rows={rows}
      canEdit={canEdit}
      addLabel="Add document type"
      fields={[
        { name: "name", label: "Name", type: "text", wide: true },
        { name: "sort_order", label: "Sort order", type: "number" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      defaults={{ name: "", sort_order: 100, is_active: true }}
      columns={[
        { label: "Name", render: (r) => <span className="font-medium">{String(r.name)} <ActiveBadge active={r.is_active} /></span> },
        { label: "Order", render: (r) => String(r.sort_order), className: "w-24" },
      ]}
    />
  );
}

export function TemplatesEditor({ rows, canEdit }: { rows: Row[]; canEdit: boolean }) {
  return (
    <LibraryEditor
      table="message_templates"
      rows={rows}
      canEdit={canEdit}
      addLabel="Add template"
      fields={[
        { name: "name", label: "Name", type: "text" },
        { name: "channel", label: "Channel", type: "select", options: [{ value: "whatsapp", label: "WhatsApp" }, { value: "email", label: "Email" }, { value: "sms", label: "SMS" }] },
        { name: "body", label: "Message", type: "textarea", hint: "Placeholders: {client} {ty} {firm} {payable} {ack}" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      defaults={{ name: "", channel: "whatsapp", body: "", is_active: true }}
      columns={[
        { label: "Template", render: (r) => <span className="font-medium">{String(r.name)} <ActiveBadge active={r.is_active} /></span> },
        { label: "Channel", render: (r) => <Badge variant="secondary">{String(r.channel)}</Badge> },
        { label: "Message", render: (r) => <span className="line-clamp-2 max-w-xl whitespace-normal text-muted-foreground">{String(r.body)}</span>, className: "whitespace-normal" },
      ]}
    />
  );
}

export function TaskRulesEditor({ rows, canEdit }: { rows: Row[]; canEdit: boolean }) {
  const statuses = (v: Row) => (v.entity === "notice" ? NOTICE_STATUSES : RETURN_STATUSES);
  const label = (r: Row) => statuses(r).find((s) => s.value === r.on_status)?.label ?? String(r.on_status);
  return (
    <LibraryEditor
      table="pipeline_task_rules"
      rows={rows}
      canEdit={canEdit}
      addLabel="Add rule"
      title={(r) => String(r.title)}
      fields={[
        { name: "entity", label: "Pipeline", type: "select", options: [{ value: "return", label: "Returns" }, { value: "notice", label: "Notices" }] },
        { name: "on_status", label: "When moved to", type: "select", optionsFor: (v) => statuses(v) },
        {
          name: "complete_on_status", label: "Marked done when it reaches", type: "select",
          optionsFor: (v) => [{ value: "", label: "The next status" }, ...statuses(v).slice(statuses(v).findIndex((s) => s.value === v.on_status) + 1)],
        },
        { name: "title", label: "Create task", type: "text", wide: true, hint: "{client} and {ty} are filled in" },
        { name: "assign_to", label: "Assign to", type: "select", options: [{ value: "assignee", label: "The assignee" }, { value: "reviewer", label: "The reviewer" }] },
        { name: "due_in_days", label: "Due in (days)", type: "number" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      defaults={{ entity: "return", on_status: "documents_received", complete_on_status: "", title: "", assign_to: "assignee", due_in_days: 3, is_active: true }}
      columns={[
        { label: "Pipeline", render: (r) => (r.entity === "return" ? "Returns" : "Notices") },
        { label: "When moved to", render: (r) => label(r) },
        { label: "Creates task", render: (r) => <span className="font-medium">{String(r.title)} <ActiveBadge active={r.is_active} /></span> },
        { label: "Done at", render: (r) => (r.complete_on_status ? statuses(r).find((s) => s.value === r.complete_on_status)?.label : "Next status") },
        { label: "For", render: (r) => (r.assign_to === "reviewer" ? "Reviewer" : "Assignee") },
        { label: "Due", render: (r) => `${r.due_in_days} days` },
      ]}
    />
  );
}
