/**
 * Demo data for local development and review. NEVER run against production.
 *
 *   npm run seed:demo            (needs .env.local with the local Supabase keys; run `npm run db:reset` first)
 *
 * Creates the firm "Ghaus & Company" with an Owner (TOTP enrolled), a Senior Associate, two Associates and a
 * Clerk, ~24 clients with relations and registrations, a closed TY2025 and a TY2026 filing season moved
 * through the pipeline by the staff themselves (so tasks, notifications and the activity log are real).
 * Logins and the Owner's TOTP secret are written to .demo-credentials.json (gitignored).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { authenticator } from "otplib";
import { writeFileSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !anon || !service) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY");
if (!/127\.0\.0\.1|localhost/.test(url) && process.env.SEED_ANYWAY !== "yes") {
  throw new Error(`Refusing to seed ${url}: demo data is for local development only (set SEED_ANYWAY=yes to override).`);
}

const PASSWORD = "Ghaus-demo-2026";
const admin = createClient(url, service, { auth: { persistSession: false } });

type Db = SupabaseClient;
function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): NonNullable<T> {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as NonNullable<T>;
}

async function session(email: string): Promise<Db> {
  const c = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return c;
}

const STAFF = [
  { key: "owner", email: "owner@ghaus.test", name: "Demo Owner", role: "owner" },
  { key: "sana", email: "sana@ghaus.test", name: "Sana Iqbal", role: "senior_associate" },
  { key: "bilal", email: "bilal@ghaus.test", name: "Bilal Ahmed", role: "associate" },
  { key: "hira", email: "hira@ghaus.test", name: "Hira Khan", role: "associate" },
  { key: "usman", email: "usman@ghaus.test", name: "Usman Ali", role: "clerk" },
] as const;
type StaffKey = (typeof STAFF)[number]["key"];

interface ClientSeed {
  name: string;
  type: "individual" | "aop" | "company";
  cnic?: string;
  ntn?: string;
  strn?: string;
  phone: string;
  city: string;
  assignee: StaffKey;
  /** TY2026 pipeline position */
  status: string;
  salary?: number;
  business?: number;
  property?: number;
  gap?: number;
  atl?: "active" | "inactive" | "unknown";
  regs?: [string, string][];
}

const CLIENTS: ClientSeed[] = [
  { name: "Ahmed Raza", type: "individual", cnic: "35202-1234567-1", phone: "0300-4123456", city: "Lahore", assignee: "bilal", status: "under_review", salary: 4_800_000, atl: "active" },
  { name: "Ayesha Raza", type: "individual", cnic: "35202-7654321-2", phone: "0301-4223344", city: "Lahore", assignee: "bilal", status: "documents_received", salary: 1_900_000, atl: "active" },
  { name: "Raza Textiles (Pvt) Ltd", type: "company", ntn: "4123456-7", strn: "3277876123456", phone: "042-35761234", city: "Faisalabad", assignee: "hira", status: "in_preparation", business: 38_000_000, atl: "active", regs: [["PRA", "P-4123456"]] },
  { name: "Imran Siddiqui", type: "individual", cnic: "42101-2345678-3", phone: "0321-2345678", city: "Karachi", assignee: "hira", status: "filed", salary: 7_200_000, atl: "active" },
  { name: "Fatima Siddiqui", type: "individual", cnic: "42101-8765432-4", phone: "0322-8765432", city: "Karachi", assignee: "hira", status: "acknowledgment_uploaded", property: 1_200_000, atl: "active" },
  { name: "Siddiqui & Sons (AOP)", type: "aop", ntn: "3456789-0", phone: "021-34567890", city: "Karachi", assignee: "hira", status: "under_review", business: 12_500_000, atl: "active", regs: [["SRB", "S-3456789"]] },
  { name: "Kamran Yousaf", type: "individual", cnic: "61101-3456789-5", phone: "0333-5123456", city: "Islamabad", assignee: "bilal", status: "not_started", salary: 3_600_000, atl: "inactive" },
  { name: "Nadia Hussain", type: "individual", cnic: "37405-4567890-6", phone: "0345-6123456", city: "Rawalpindi", assignee: "bilal", status: "documents_requested", salary: 2_400_000, atl: "active" },
  { name: "Tariq Mehmood", type: "individual", cnic: "35201-5678901-7", phone: "0300-7123456", city: "Lahore", assignee: "hira", status: "sent_for_client_approval", business: 6_800_000, gap: 2_500_000, atl: "active" },
  { name: "Mehmood Traders", type: "aop", ntn: "2345678-9", phone: "042-37123456", city: "Lahore", assignee: "hira", status: "approved", business: 9_400_000, atl: "active" },
  { name: "Zainab Akhtar", type: "individual", cnic: "17301-6789012-8", phone: "0311-9123456", city: "Peshawar", assignee: "bilal", status: "in_preparation", salary: 2_950_000, gap: 1_800_000, atl: "unknown", regs: [["KPRA", "K-6789012"]] },
  { name: "Hamza Qureshi", type: "individual", cnic: "35202-7890123-9", phone: "0302-1234567", city: "Lahore", assignee: "bilal", status: "documents_received", salary: 5_100_000, atl: "active" },
  { name: "Qureshi Engineering (SMC-Pvt) Ltd", type: "company", ntn: "5678901-2", strn: "3277876654321", phone: "042-35123456", city: "Lahore", assignee: "hira", status: "documents_requested", business: 21_000_000, atl: "active", regs: [["PRA", "P-5678901"]] },
  { name: "Saima Noor", type: "individual", cnic: "36302-8901234-0", phone: "0306-2345678", city: "Multan", assignee: "bilal", status: "filed", salary: 1_650_000, atl: "active" },
  { name: "Faisal Iqbal", type: "individual", cnic: "33100-9012345-1", phone: "0300-8765432", city: "Faisalabad", assignee: "hira", status: "not_started", business: 4_200_000, atl: "inactive" },
  { name: "Iqbal Rice Mills", type: "aop", ntn: "6789012-3", phone: "041-2654321", city: "Faisalabad", assignee: "hira", status: "in_preparation", business: 15_800_000, atl: "active" },
  { name: "Rabia Shah", type: "individual", cnic: "54400-0123456-2", phone: "0333-1239876", city: "Quetta", assignee: "bilal", status: "not_started", salary: 2_100_000, atl: "unknown", regs: [["BRA", "B-0123456"]] },
  { name: "Usama Farooq", type: "individual", cnic: "35202-1122334-3", phone: "0321-4455667", city: "Lahore", assignee: "bilal", status: "closed", salary: 3_300_000, atl: "active" },
  { name: "Farooq Pharma (Pvt) Ltd", type: "company", ntn: "7890123-4", strn: "3277876111222", phone: "042-35223344", city: "Lahore", assignee: "hira", status: "not_started", business: 64_000_000, atl: "active", regs: [["PRA", "P-7890123"], ["SRB", "S-7890123"]] },
  { name: "Mariam Javed", type: "individual", cnic: "61101-2233445-6", phone: "0345-9988776", city: "Islamabad", assignee: "bilal", status: "under_review", salary: 6_400_000, gap: -1_200_000, atl: "active" },
  { name: "Javed Builders", type: "aop", ntn: "8901234-5", phone: "051-2345678", city: "Islamabad", assignee: "hira", status: "documents_requested", business: 27_500_000, atl: "active" },
  { name: "Omar Sheikh", type: "individual", cnic: "42201-3344556-7", phone: "0300-2233445", city: "Karachi", assignee: "bilal", status: "in_preparation", property: 2_800_000, salary: 1_200_000, atl: "active" },
  { name: "Sheikh Logistics (Pvt) Ltd", type: "company", ntn: "9012345-6", strn: "3277876333444", phone: "021-35667788", city: "Karachi", assignee: "hira", status: "documents_received", business: 44_000_000, atl: "active", regs: [["SRB", "S-9012345"]] },
  { name: "Asma Bukhari", type: "individual", cnic: "35202-4455667-8", phone: "0301-5566778", city: "Lahore", assignee: "bilal", status: "not_started", salary: 980_000, atl: "unknown" },
];

const ORDER = [
  "not_started", "documents_requested", "documents_received", "in_preparation", "under_review",
  "sent_for_client_approval", "approved", "filed", "acknowledgment_uploaded", "closed",
];

async function main() {
  // 1. Logins
  const ids = {} as Record<StaffKey, string>;
  for (const s of STAFF) {
    const res = await admin.auth.admin.createUser({ email: s.email, password: PASSWORD, email_confirm: true });
    if (res.error) throw new Error(`create ${s.email}: ${res.error.message} (run npm run db:reset first)`);
    ids[s.key] = res.data.user.id;
  }

  // 2. Firm, created by the Owner through the real sign-up RPC
  const owner = await session("owner@ghaus.test");
  must(await owner.rpc("create_firm", { p_firm_name: "Ghaus & Company", p_full_name: "Demo Owner" }), "create firm");

  // 3. Owner enrols TOTP and verifies (aal2), as the app requires
  const enrolled = must(await owner.auth.mfa.enroll({ factorType: "totp", friendlyName: "Demo authenticator" }), "enrol TOTP");
  const totpSecret = enrolled.totp.secret;
  must(await owner.auth.mfa.challengeAndVerify({ factorId: enrolled.id, code: authenticator.generate(totpSecret) }), "verify TOTP");

  const firm = must(await owner.from("firms").select("id").single(), "firm") as { id: string };
  must(await owner.from("firms").update({ city: "Lahore", phone: "042-35714000", email: "office@ghaus.test", address: "Office 5, Main Boulevard, Gulberg III" }).eq("id", firm.id), "firm details");
  const roles = must(await owner.from("roles").select("id, key"), "roles") as { id: string; key: string }[];
  const roleId = (key: string) => roles.find((r) => r.key === key)!.id;
  for (const s of STAFF.filter((x) => x.key !== "owner")) {
    must(await owner.from("users").insert({ id: ids[s.key], firm_id: firm.id, role_id: roleId(s.role), full_name: s.name, email: s.email }), `add ${s.name}`);
  }

  // Example extension from the brief (demo only, not a real circular)
  const rule = must(await owner.from("deadline_rules").select("id").eq("key", "annual_return_individual_aop").single(), "rule") as { id: string };
  must(await owner.from("deadline_overrides").insert({
    rule_id: rule.id, tax_year: 2026, client_types: ["individual", "aop"], due_date: "2026-10-15",
    reference: "Circular 3 of 2026-27", notes: "Demo data: example extension from the brief.",
  }), "override");

  // 4. Clients (Owner), relations and registrations
  const clientIds: Record<string, string> = {};
  for (const c of CLIENTS) {
    const row = must(await owner.from("clients").insert({
      client_type: c.type, name: c.name, cnic: c.cnic ?? null, ntn: c.ntn ?? (c.cnic ? c.cnic.replace(/-/g, "") : null), strn: c.strn ?? null,
      phone: c.phone, whatsapp: c.phone.startsWith("03") ? c.phone : null, city: c.city,
      assignee_id: ids[c.assignee], reviewer_id: ids.sana, referred_by: c.name.includes("Siddiqui") ? "Imran Siddiqui" : null,
    }).select("id").single(), `client ${c.name}`) as { id: string };
    clientIds[c.name] = row.id;
    for (const [authority, no] of c.regs ?? []) {
      must(await owner.from("client_registrations").insert({ client_id: row.id, authority, registration_no: no }), "registration");
    }
  }
  const rel = async (client: string, related: string, relation: string) =>
    must(await owner.from("client_relations").insert({ client_id: clientIds[client], related_client_id: clientIds[related], relation }), "relation");
  await rel("Ahmed Raza", "Ayesha Raza", "spouse");
  await rel("Raza Textiles (Pvt) Ltd", "Ahmed Raza", "director");
  await rel("Raza Textiles (Pvt) Ltd", "Ayesha Raza", "director");
  await rel("Imran Siddiqui", "Fatima Siddiqui", "spouse");
  await rel("Siddiqui & Sons (AOP)", "Imran Siddiqui", "partner");
  await rel("Mehmood Traders", "Tariq Mehmood", "partner");
  await rel("Qureshi Engineering (SMC-Pvt) Ltd", "Hamza Qureshi", "director");
  await rel("Iqbal Rice Mills", "Faisal Iqbal", "partner");
  await rel("Farooq Pharma (Pvt) Ltd", "Usama Farooq", "director");
  await rel("Javed Builders", "Mariam Javed", "partner");
  await rel("Sheikh Logistics (Pvt) Ltd", "Omar Sheikh", "director");

  // 5. TY2025: closed, imported by the Owner (historical import is Owner-only)
  const opening2026: Record<string, number> = {};
  for (const [i, c] of CLIENTS.entries()) {
    if (i % 3 === 2) continue; // some clients are new this year
    const income = Math.round(((c.salary ?? 0) + (c.business ?? 0) + (c.property ?? 0)) * 0.9);
    const opening = 2_000_000 + i * 750_000;
    const expenses = Math.round(income * 0.45);
    const closing = opening + income - expenses;
    const cty = must(await owner.from("client_tax_years").insert({
      client_id: clientIds[c.name], tax_year: 2025, return_status: "closed", assignee_id: ids[c.assignee], reviewer_id: ids.sana,
      income_salary: Math.round((c.salary ?? 0) * 0.9), income_business: Math.round((c.business ?? 0) * 0.9), income_property: Math.round((c.property ?? 0) * 0.9),
      taxable_income: income, tax_chargeable: Math.round(income * 0.12), tax_withheld_paid: Math.round(income * 0.11),
      opening_wealth: opening, personal_expenses: expenses, closing_wealth: closing,
      filed_on: `2025-09-${String(10 + (i % 18)).padStart(2, "0")}`, acknowledgment_no: `100000${2025}${String(i).padStart(4, "0")}`,
      atl_status: "active", atl_last_checked_on: "2026-03-01",
    }).select("id").single(), "TY2025") as { id: string };
    opening2026[c.name] = closing;
    void cty;
  }

  // 6. TY2026 season: records created, then moved through the pipeline by the people who do the work
  const sessions: Record<StaffKey, Db> = {
    owner,
    sana: await session("sana@ghaus.test"),
    bilal: await session("bilal@ghaus.test"),
    hira: await session("hira@ghaus.test"),
    usman: await session("usman@ghaus.test"),
  };
  for (const [i, c] of CLIENTS.entries()) {
    const preparer = sessions[c.assignee];
    const income = (c.salary ?? 0) + (c.business ?? 0) + (c.property ?? 0);
    const opening = opening2026[c.name] ?? 1_500_000 + i * 500_000;
    const expenses = Math.round(income * 0.42);
    const cty = must(await sessions.usman.from("client_tax_years").insert({
      client_id: clientIds[c.name], tax_year: 2026, assignee_id: ids[c.assignee], reviewer_id: ids.sana, opening_wealth: opening,
    }).select("id, updated_at").single(), "TY2026") as { id: string; updated_at: string };

    const target = ORDER.indexOf(c.status);
    const touch = async (db: Db, patch: Record<string, unknown>) =>
      must(await db.from("client_tax_years").update(patch).eq("id", cty.id).select("id").single(), `update ${c.name}`);

    if (target >= ORDER.indexOf("in_preparation")) {
      const exempt = c.type === "individual" ? 150_000 : 0;
      const finalTax = c.business ? Math.round(c.business * 0.05) : 0;
      const closing = opening + income + exempt + finalTax - expenses + (c.gap ?? 0);
      await touch(preparer, {
        income_salary: c.salary ?? 0, income_business: c.business ?? 0, income_property: c.property ?? 0,
        income_exempt: exempt, income_final_fixed: finalTax, taxable_income: income,
        tax_chargeable: Math.round(income * 0.13), tax_withheld_paid: Math.round(income * 0.115),
        personal_expenses: expenses, atl_status: c.atl ?? "unknown", atl_last_checked_on: c.atl === "unknown" ? null : "2026-09-01",
      });
      // Wealth statement lines that add up to the closing figure
      const bank = Math.round(closing * 0.25);
      const vehicle = Math.round(closing * 0.15);
      const property = closing - bank - vehicle + 1_000_000;
      for (const [category, description, cost, cash] of [
        ["bank_balance", `${["HBL", "Meezan", "UBL", "MCB"][i % 4]} current account`, bank, true],
        ["vehicle", ["Toyota Corolla 2021", "Honda Civic 2022", "Suzuki Cultus 2020", "Toyota Fortuner 2019"][i % 4], vehicle, false],
        ["immovable_property", `${["House", "Plot", "Flat", "Shop"][i % 4]} in ${c.city}`, property, false],
        ["liabilities", "Bank loan", 1_000_000, false],
      ] as const) {
        must(await preparer.from("wealth_items").insert({ client_tax_year_id: cty.id, client_id: clientIds[c.name], category, description, cost, is_cash_equivalent: cash }), "wealth item");
      }
    }

    for (let step = 1; step <= target; step++) {
      const to = ORDER[step];
      if (to === "sent_for_client_approval") {
        await touch(sessions.sana, { review_signed_off_at: new Date().toISOString() });
        await touch(sessions.sana, { return_status: to });
      } else if (to === "filed") {
        await touch(preparer, { return_status: to, filed_on: `2026-09-${String(20 + (i % 9)).padStart(2, "0")}`, acknowledgment_no: `100000${2026}${String(i).padStart(4, "0")}` });
      } else {
        const actor = ["documents_requested", "documents_received"].includes(to) ? sessions.usman : preparer;
        await touch(actor, { return_status: to });
      }
    }
  }

  // A sent-back return, comments with @mentions, and some manual tasks
  const tariqCty = must(await owner.from("client_tax_years").select("id").eq("client_id", clientIds["Zainab Akhtar"]).eq("tax_year", 2026).single(), "cty") as { id: string };
  must(await sessions.sana.from("comments").insert({
    entity_type: "client_tax_year", entity_id: tariqCty.id, client_id: clientIds["Zainab Akhtar"],
    body: "@Bilal Ahmed the closing wealth is Rs 18 lakh higher than income explains. Please ask about gifts or the plot purchase before review.",
    mentions: [ids.bilal],
  }), "comment");
  must(await sessions.bilal.from("comments").insert({
    entity_type: "client", entity_id: clientIds["Ahmed Raza"], client_id: clientIds["Ahmed Raza"],
    body: "Client prefers WhatsApp. @Usman Ali please collect the original salary certificate from his office.",
    mentions: [ids.usman],
  }), "comment");
  must(await owner.from("tasks").insert([
    { title: "Call Kamran Yousaf about ATL restoration", assignee_id: ids.bilal, client_id: clientIds["Kamran Yousaf"], due_date: "2026-10-09" },
    { title: "Renew PRA registration certificate", assignee_id: ids.usman, client_id: clientIds["Raza Textiles (Pvt) Ltd"], due_date: "2026-10-20" },
    { title: "Prepare filing season status for partners meeting", assignee_id: ids.sana, due_date: "2026-10-06" },
  ]), "tasks");

  const creds = {
    note: "Local demo logins. Do not reuse these anywhere real.",
    password: PASSWORD,
    users: STAFF.map((s) => ({ email: s.email, name: s.name, role: s.role })),
    owner_totp_secret: totpSecret,
  };
  writeFileSync(".demo-credentials.json", JSON.stringify(creds, null, 2));
  console.log(`Seeded Ghaus & Company: ${CLIENTS.length} clients, TY2025 + TY2026.`);
  console.log(`Logins: ${STAFF.map((s) => s.email).join(", ")} / password ${PASSWORD}`);
  console.log("Owner TOTP secret (add to an authenticator app): " + totpSecret);
  console.log("Written to .demo-credentials.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
