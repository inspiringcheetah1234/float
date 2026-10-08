import { describe, expect, it } from "vitest";
import { filingSeasonYear, taxYearForDate, taxYearLabel, taxYearOptions } from "./tax-year";
import { formatCnic, isValidCnic } from "./cnic";
import { formatAmount, formatPKR, formatPKRCompact, parseAmount } from "./money";
import { addDays, daysBetween, formatDate, formatDateTime, parseDate, relativeDue, todayPK } from "./dates";
import { needsSignOff, nextReturnStatus, previousReturnStatus } from "./pipeline";
import { isGapFlagged, reconcile, type ReconciliationInput } from "./wealth";

describe("tax year", () => {
  it("maps dates to Pakistani tax years (1 July to 30 June)", () => {
    expect(taxYearForDate("2025-07-01")).toBe(2026);
    expect(taxYearForDate("2026-06-30")).toBe(2026);
    expect(taxYearForDate("2026-10-08")).toBe(2027);
  });
  it("labels tax years", () => {
    expect(taxYearLabel(2026)).toBe("TY2026 (Jul 2025–Jun 2026)");
  });
  it("filing season is the last completed tax year", () => {
    expect(filingSeasonYear("2026-10-08")).toBe(2026);
    expect(filingSeasonYear("2026-06-15")).toBe(2025);
  });
  it("offers recent years, newest first", () => {
    expect(taxYearOptions("2026-10-08", 2)).toEqual([2027, 2026, 2025]);
  });
});

describe("CNIC", () => {
  it("validates the 12345-1234567-1 format", () => {
    expect(isValidCnic("35202-1234567-1")).toBe(true);
    expect(isValidCnic("3520212345671")).toBe(false);
    expect(isValidCnic("35202-123456-1")).toBe(false);
  });
  it("formats 13 digits", () => {
    expect(formatCnic("3520212345671")).toBe("35202-1234567-1");
    expect(formatCnic("35202 1234567 1")).toBe("35202-1234567-1");
    expect(formatCnic("12345")).toBeNull();
  });
});

describe("money", () => {
  it("groups in lakh/crore", () => {
    expect(formatAmount(123456789, "lakh")).toBe("12,34,56,789");
    expect(formatAmount(100000, "lakh")).toBe("1,00,000");
    expect(formatAmount(999, "lakh")).toBe("999");
    expect(formatAmount(1000, "lakh")).toBe("1,000");
  });
  it("groups internationally", () => {
    expect(formatAmount(123456789, "international")).toBe("123,456,789");
  });
  it("formats PKR with sign and decimals", () => {
    expect(formatPKR(-2500000, "lakh")).toBe("-Rs 25,00,000");
    expect(formatPKR("1234.5", "international", 2)).toBe("Rs 1,234.50");
    expect(formatPKR(0, "lakh")).toBe("Rs 0");
    expect(formatPKR(-0.4, "lakh")).toBe("Rs 0");
  });
  it("compacts", () => {
    expect(formatPKRCompact(25000000, "lakh")).toBe("Rs 2.5 crore");
    expect(formatPKRCompact(750000, "lakh")).toBe("Rs 7.5 lakh");
    expect(formatPKRCompact(7000000, "international")).toBe("Rs 7M");
  });
  it("parses user input", () => {
    expect(parseAmount("12,34,567")).toBe(1234567);
    expect(parseAmount("Rs 1,000.50")).toBe(1000.5);
    expect(parseAmount("(5,000)")).toBe(-5000);
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("1.234")).toBeNull();
  });
});

describe("dates", () => {
  it("formats DD-MM-YYYY", () => {
    expect(formatDate("2026-09-30")).toBe("30-09-2026");
    expect(formatDate(null)).toBe("–");
  });
  it("uses Pakistan time for today and timestamps", () => {
    // 20:30 UTC on 30 Sep is 01:30 on 1 Oct in Karachi (UTC+5)
    expect(todayPK(new Date("2026-09-30T20:30:00Z"))).toBe("2026-10-01");
    expect(formatDateTime("2026-09-30T20:30:00Z")).toBe("01-10-2026 01:30");
  });
  it("parses DD-MM-YYYY and rejects impossible dates", () => {
    expect(parseDate("30-09-2026")).toBe("2026-09-30");
    expect(parseDate("1/7/2025")).toBe("2025-07-01");
    expect(parseDate("31-02-2026")).toBeNull();
  });
  it("does date arithmetic", () => {
    expect(addDays("2026-09-25", 7)).toBe("2026-10-02");
    expect(daysBetween("2026-10-08", "2026-10-15")).toBe(7);
    expect(relativeDue("2026-10-05", "2026-10-08")).toBe("3 days overdue");
    expect(relativeDue("2026-10-08", "2026-10-08")).toBe("due today");
    expect(relativeDue("2026-10-11", "2026-10-08")).toBe("in 3 days");
  });
});

describe("pipeline", () => {
  it("mirrors the review gate", () => {
    expect(needsSignOff("under_review", "sent_for_client_approval", false)).toBe(true);
    expect(needsSignOff("under_review", "sent_for_client_approval", true)).toBe(false);
    expect(needsSignOff("in_preparation", "filed", false)).toBe(true);
    expect(needsSignOff("approved", "filed", false)).toBe(false);
    expect(needsSignOff("in_preparation", "under_review", false)).toBe(false);
  });
  it("steps through statuses", () => {
    expect(nextReturnStatus("under_review")).toBe("sent_for_client_approval");
    expect(nextReturnStatus("closed")).toBeNull();
    expect(previousReturnStatus("not_started")).toBeNull();
  });
});

describe("wealth reconciliation", () => {
  const base: ReconciliationInput = {
    opening_wealth: 1_000_000, closing_wealth: 0,
    income_salary: 2_400_000, income_property: 0, income_business: 0, income_capital_gains: 0, income_other_sources: 0,
    income_exempt: 0, income_final_fixed: 0,
    inflow_gifts: 0, inflow_inheritance: 0, inflow_loans: 0, inflow_foreign_remittance: 0, inflow_other: 0,
    personal_expenses: 1_200_000, other_outflows: 0,
  };
  it("matches the SQL view (same numbers as the pgTAP test)", () => {
    const r = reconcile(base, [
      { category: "bank_balance", cost: 1_500_000, is_cash_equivalent: true },
      { category: "vehicle", cost: 3_000_000, is_cash_equivalent: false },
      { category: "liabilities", cost: 1_000_000, is_cash_equivalent: false },
    ]);
    expect(r.expectedClosing).toBe(2_200_000);
    expect(r.closing).toBe(3_500_000);
    expect(r.gap).toBe(1_300_000);
    expect(r.cashEquivalents).toBe(1_500_000);
    expect(r.closingFromStatement).toBe(true);
  });
  it("uses closing_wealth when there is no statement", () => {
    const r = reconcile({ ...base, closing_wealth: 2_200_000 });
    expect(r.gap).toBe(0);
    expect(r.closingFromStatement).toBe(false);
  });
  it("counts inflows and flags gaps over the threshold either way", () => {
    const r = reconcile({ ...base, closing_wealth: 2_700_000, inflow_gifts: 500_000 });
    expect(r.gap).toBe(0);
    expect(isGapFlagged(-150_000, 100_000)).toBe(true);
    expect(isGapFlagged(100_000, 100_000)).toBe(false);
  });
});

import { describeActivity } from "./activity";

describe("activity descriptions", () => {
  it("describes pipeline moves", () => {
    expect(
      describeActivity({
        action: "update", table_name: "client_tax_years", changed_fields: ["return_status"],
        before: { return_status: "under_review" }, after: { return_status: "sent_for_client_approval" },
      }),
    ).toBe("moved return from Under review to Sent for client approval");
  });
  it("describes field edits and inserts", () => {
    expect(
      describeActivity({ action: "update", table_name: "client_tax_years", changed_fields: ["income_salary", "tax_chargeable"], before: {}, after: {} }),
    ).toBe("updated return: salary income, tax chargeable");
    expect(describeActivity({ action: "insert", table_name: "wealth_items", changed_fields: null, before: null, after: { description: "HBL account" } }))
      .toBe('added wealth statement line "HBL account"');
  });
});

import { periodicDueDates } from "./deadlines";

describe("periodic deadlines", () => {
  const monthly = { id: "r1", name: "Sales tax (FBR)", authority: "FBR", due_day: 18, month_offset: 1, period_months: 1 };
  const quarterly = { id: "r2", name: "Withholding statement", authority: "FBR", due_day: 20, month_offset: 1, period_months: 3 };
  it("computes the next monthly due date from the rule", () => {
    const d = periodicDueDates(monthly, [], "2026-10-08", "2026-11-07");
    expect(d.map((x) => [x.period_start, x.due_date])).toEqual([["2026-09-01", "2026-10-18"]]);
  });
  it("computes quarter-end statements", () => {
    const d = periodicDueDates(quarterly, [], "2026-10-01", "2026-10-31");
    expect(d.map((x) => [x.period_start, x.period_end, x.due_date])).toEqual([["2026-07-01", "2026-09-30", "2026-10-20"]]);
  });
  it("applies an override for a period", () => {
    const d = periodicDueDates(monthly, [{ rule_id: "r1", period_start: "2026-09-01", due_date: "2026-10-25", reference: "SRO 1/2026" }], "2026-10-08", "2026-11-07");
    expect(d[0]).toMatchObject({ due_date: "2026-10-25", reference: "SRO 1/2026" });
  });
});
