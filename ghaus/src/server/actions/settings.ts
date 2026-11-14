"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NOTICE_STATUSES, RETURN_STATUSES } from "@/lib/domain/pipeline";
import { dbError, fail, ok, updateWithLock, zAmount, zLockToken, zodError, zOptDate, zOptText, zUuid, type ActionResult } from "./_lib";

async function requireSettingsEdit() {
  const ctx = await getContext();
  if (!ctx.can("settings", "edit")) return null;
  return ctx;
}

// ---- Firm ---------------------------------------------------------------------
const FirmInput = z.object({
  name: z.string().trim().min(2).max(200),
  ntn: zOptText,
  phone: zOptText,
  email: zOptText,
  address: zOptText,
  city: zOptText,
  default_number_format: z.enum(["lakh", "international"]),
  wealth_gap_threshold: zAmount.refine((n) => n >= 0, "cannot be negative"),
  atl_surcharge_individual: zAmount.refine((n) => n >= 0),
  atl_surcharge_aop: zAmount.refine((n) => n >= 0),
  atl_surcharge_company: zAmount.refine((n) => n >= 0),
  atl_risk_days: z.number().int().min(0).max(365),
  s114c_enabled: z.boolean(),
  s114c_vehicle_threshold: zAmount.refine((n) => n >= 0),
  s114c_property_threshold: zAmount.refine((n) => n >= 0),
  s114c_ratio: z.number().min(0.01).max(10),
});
export type FirmValues = z.input<typeof FirmInput>;

export async function updateFirm(id: string, updatedAt: string, input: FirmValues): Promise<ActionResult<{ updated_at: string }>> {
  const parsed = FirmInput.safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  const supabase = await createClient();
  const res = await updateWithLock(supabase, "firms", id, updatedAt, parsed.data);
  if (res.ok) revalidatePath("/", "layout");
  return res;
}

// ---- Users ----------------------------------------------------------------------
const NewUserInput = z.object({
  full_name: z.string().trim().min(2, "Name is required").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role_id: zUuid,
  password: z.string().min(10, "Temporary password must be at least 10 characters").max(72),
});

/** Creates the login (service role) and the firm membership (as the caller, so RLS + guards apply). */
export async function addUser(input: z.input<typeof NewUserInput>): Promise<ActionResult<{ id: string }>> {
  const parsed = NewUserInput.safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  const ctx = await requireSettingsEdit();
  if (!ctx) return fail("You don't have permission to add users.");
  const supabase = await createClient();
  const { data: role } = await supabase.from("roles").select("id, key").eq("id", parsed.data.role_id).maybeSingle();
  if (!role) return fail("Unknown role.");
  if (role.key === "owner" && !ctx.isOwner) return fail("Only an Owner can add another Owner.");

  const admin = createAdminClient();
  const created = await admin.auth.admin.createUser({ email: parsed.data.email, password: parsed.data.password, email_confirm: true });
  if (created.error) {
    return fail(created.error.message.includes("already") ? "A login with that email already exists." : "Could not create the login.");
  }
  const { error } = await supabase.from("users").insert({
    id: created.data.user.id,
    role_id: parsed.data.role_id,
    full_name: parsed.data.full_name,
    email: parsed.data.email,
  });
  if (error) {
    await admin.auth.admin.deleteUser(created.data.user.id);
    return fail(dbError(error));
  }
  revalidatePath("/settings/users");
  return ok({ id: created.data.user.id });
}

const UserUpdate = z.object({
  full_name: z.string().trim().min(2).max(200),
  phone: zOptText,
  role_id: zUuid,
  is_active: z.boolean(),
});

export async function updateUser(id: string, updatedAt: string, input: z.input<typeof UserUpdate>): Promise<ActionResult<{ updated_at: string }>> {
  const parsed = UserUpdate.safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  if (!zUuid.safeParse(id).success || !zLockToken.safeParse(updatedAt).success) return fail("Bad request");
  const ctx = await requireSettingsEdit();
  if (!ctx) return fail("You don't have permission to edit users.");
  if (id === ctx.userId && !parsed.data.is_active) return fail("You cannot deactivate yourself.");
  const supabase = await createClient();
  const res = await updateWithLock(supabase, "users", id, updatedAt, parsed.data);
  if (!res.ok) return res;
  // Deactivated staff cannot sign in at all (RLS already hides every row from them).
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(id, { ban_duration: parsed.data.is_active ? "none" : "876000h" });
  revalidatePath("/settings/users");
  revalidatePath("/", "layout");
  return res;
}

/** Confirms the target belongs to the caller's firm (RLS-visible) before any service-role call. */
async function sameFirmUser(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("users").select("id, email").eq("id", id).maybeSingle();
  return data;
}

export async function resetUserPassword(id: string, password: string): Promise<ActionResult> {
  if (!zUuid.safeParse(id).success) return fail("Bad request");
  if (typeof password !== "string" || password.length < 10) return fail("Temporary password must be at least 10 characters.");
  const ctx = await requireSettingsEdit();
  if (!ctx) return fail("You don't have permission to do that.");
  if (!(await sameFirmUser(id))) return fail("User not found.");
  const { error } = await createAdminClient().auth.admin.updateUserById(id, { password });
  if (error) return fail("Could not reset the password.");
  return ok(null);
}

/** For a lost phone: removes the user's authenticator so they enrol again at next sign-in. */
export async function resetUserMfa(id: string): Promise<ActionResult<{ removed: number }>> {
  if (!zUuid.safeParse(id).success) return fail("Bad request");
  const ctx = await requireSettingsEdit();
  if (!ctx || !ctx.isOwner) return fail("Only an Owner can reset two-factor authentication.");
  if (!(await sameFirmUser(id))) return fail("User not found.");
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId: id });
  if (error) return fail("Could not read the user's authenticators.");
  for (const f of data.factors) await admin.auth.admin.mfa.deleteFactor({ userId: id, id: f.id });
  return ok({ removed: data.factors.length });
}

// ---- Roles & permissions ---------------------------------------------------------
const MODULES = ["clients", "returns", "notices", "fees", "vault", "settings"] as const;
const PermInput = z.record(z.enum(MODULES), z.enum(["none", "view", "edit"]));

export async function saveRolePermissions(roleId: string, input: z.input<typeof PermInput>): Promise<ActionResult> {
  const parsed = PermInput.safeParse(input);
  if (!parsed.success || !zUuid.safeParse(roleId).success) return fail("Bad request");
  if (!(await requireSettingsEdit())) return fail("You don't have permission to change permissions.");
  const supabase = await createClient();
  const rows = Object.entries(parsed.data).map(([module, level]) => ({
    role_id: roleId,
    module: module as (typeof MODULES)[number],
    can_view: level !== "none",
    can_edit: level === "edit",
  }));
  const { error } = await supabase.from("role_permissions").upsert(rows, { onConflict: "role_id,module" });
  if (error) return fail(dbError(error));
  revalidatePath("/settings/roles");
  revalidatePath("/", "layout");
  return ok(null);
}

export async function addRole(name: string): Promise<ActionResult> {
  const clean = String(name ?? "").trim();
  if (clean.length < 2) return fail("Role name is required.");
  const key = clean.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^(\d)/, "r_$1") || "role";
  if (!(await requireSettingsEdit())) return fail("You don't have permission to add roles.");
  const supabase = await createClient();
  const { error } = await supabase.from("roles").insert({ key, name: clean, is_system: false, sort_order: 50 });
  if (error) return fail(error.code === "23505" ? "A role with that name already exists." : dbError(error));
  revalidatePath("/settings/roles");
  return ok(null);
}

// ---- Settings libraries (generic) --------------------------------------------------
const clientTypes = z.array(z.enum(["individual", "aop", "company"])).nullable().optional()
  .transform((v) => (v && v.length ? v : null));
const optInt = (min: number, max: number) => z.preprocess((v) => (v === "" || v === undefined ? null : v), z.coerce.number().int().min(min).max(max).nullable());

const SCHEMAS = {
  deadline_rules: z.object({
    name: z.string().trim().min(2).max(200),
    kind: z.enum(["annual_return", "sales_tax_return", "withholding_statement", "appeal_limitation"]),
    client_types: clientTypes,
    authority: zOptText,
    forum: z.preprocess((v) => (v === "" ? null : v), z.enum(["commissioner_appeals", "atir", "high_court", "supreme_court"]).nullable().optional()),
    due_month: optInt(1, 12),
    due_day: optInt(1, 31),
    year_offset: optInt(-5, 5),
    month_offset: optInt(0, 24),
    period_months: z.preprocess((v) => (v === "" || v === undefined ? null : Number(v)), z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]).nullable()),
    days_after: optInt(1, 3650),
    notes: zOptText,
    is_active: z.boolean(),
  }).superRefine((v, ctx) => {
    if (v.kind === "annual_return" && (!v.due_month || !v.due_day)) ctx.addIssue({ code: "custom", message: "Annual returns need a due month and day" });
    if ((v.kind === "sales_tax_return" || v.kind === "withholding_statement") && (!v.due_day || v.month_offset == null || !v.period_months))
      ctx.addIssue({ code: "custom", message: "Periodic deadlines need a due day, month offset and period" });
    if (v.kind === "appeal_limitation" && (!v.forum || !v.days_after)) ctx.addIssue({ code: "custom", message: "Appeal limitation needs a forum and number of days" });
  }),
  deadline_overrides: z.object({
    rule_id: zUuid,
    tax_year: optInt(2000, 2100),
    period_start: zOptDate,
    client_types: clientTypes,
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "is required"),
    reference: z.string().trim().min(2, "Reference (e.g. circular number) is required").max(300),
    notes: zOptText,
  }).refine((v) => v.tax_year != null || v.period_start != null, "Give a tax year (annual returns) or a period start (monthly/quarterly)"),
  notice_sections: z.object({
    law: z.enum(["ito_2001", "sta_1990", "provincial"]),
    section: z.string().trim().min(1).max(50),
    title: z.string().trim().min(2).max(200),
    description: zOptText,
    default_reply_days: z.coerce.number().int().min(0).max(365),
    reply_template: zOptText,
    is_active: z.boolean(),
  }),
  document_types: z.object({
    name: z.string().trim().min(2).max(100),
    sort_order: z.coerce.number().int().min(0).max(10000),
    is_active: z.boolean(),
  }),
  message_templates: z.object({
    name: z.string().trim().min(2).max(200),
    channel: z.enum(["whatsapp", "email", "sms"]),
    body: z.string().trim().min(2).max(5000),
    is_active: z.boolean(),
  }),
  pipeline_task_rules: z.object({
    entity: z.enum(["return", "notice"]),
    on_status: z.string(),
    complete_on_status: z.preprocess((v) => (v === "" ? null : v), z.string().nullable().optional()),
    title: z.string().trim().min(2).max(300),
    assign_to: z.enum(["assignee", "reviewer"]),
    due_in_days: z.coerce.number().int().min(0).max(365),
    is_active: z.boolean(),
  }).refine(
    (v) => {
      const list = v.entity === "return" ? RETURN_STATUSES : NOTICE_STATUSES;
      const rank = (x: string) => list.findIndex((s) => s.value === x);
      return rank(v.on_status) >= 0 && (!v.complete_on_status || rank(v.complete_on_status) > rank(v.on_status));
    },
    "Pick pipeline statuses; the task must complete at a later status than it is created",
  ),
} as const;

export type LibraryTable = keyof typeof SCHEMAS;

function keyFrom(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^(\d)/, "k_$1").slice(0, 60) || "item";
}

export async function saveLibraryRow(
  table: LibraryTable,
  id: string | null,
  updatedAt: string | null,
  values: Record<string, unknown>,
): Promise<ActionResult<{ updated_at?: string }>> {
  const schema = SCHEMAS[table];
  if (!schema) return fail("Unknown table");
  const parsed = schema.safeParse(values);
  if (!parsed.success) return fail(zodError(parsed.error));
  if (!(await requireSettingsEdit())) return fail("You don't have permission to change settings.");
  const supabase = await createClient();
  const data = parsed.data as Record<string, unknown>;
  if (id) {
    if (!updatedAt) return fail("Bad request");
    const res = await updateWithLock(supabase, table, id, updatedAt, data as never);
    if (res.ok) revalidatePath("/settings", "layout");
    return res;
  }
  if (table === "document_types" || table === "message_templates") data.key = keyFrom(String(data.name));
  if (table === "deadline_rules") data.key = keyFrom(String(data.name));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from(table) as any).insert(data);
  if (error) return fail(error.code === "23505" ? "An entry with that name already exists." : dbError(error));
  revalidatePath("/settings", "layout");
  return ok({});
}

export async function archiveLibraryRow(table: LibraryTable, id: string, updatedAt: string): Promise<ActionResult<{ updated_at: string }>> {
  if (!SCHEMAS[table] || !zUuid.safeParse(id).success) return fail("Bad request");
  if (!(await requireSettingsEdit())) return fail("You don't have permission to change settings.");
  const supabase = await createClient();
  const res = await updateWithLock(supabase, table, id, updatedAt, { deleted_at: new Date().toISOString() } as never);
  if (res.ok) revalidatePath("/settings", "layout");
  return res;
}
