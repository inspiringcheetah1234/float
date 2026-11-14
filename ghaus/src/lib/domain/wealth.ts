import type { Enums } from "@/types/db";

export type WealthCategory = Enums<"wealth_category">;

export const WEALTH_CATEGORIES: { value: WealthCategory; label: string; cashEquivalent: boolean }[] = [
  { value: "immovable_property", label: "Immovable property", cashEquivalent: false },
  { value: "vehicle", label: "Vehicle", cashEquivalent: false },
  { value: "bank_balance", label: "Bank balance", cashEquivalent: true },
  { value: "cash", label: "Cash", cashEquivalent: true },
  { value: "gold", label: "Gold / jewellery", cashEquivalent: false },
  { value: "securities", label: "Securities / investments", cashEquivalent: false },
  { value: "receivables", label: "Receivables / advances", cashEquivalent: false },
  { value: "business_capital", label: "Business capital", cashEquivalent: false },
  { value: "liabilities", label: "Liabilities", cashEquivalent: false },
  { value: "other", label: "Other assets", cashEquivalent: false },
];

export function wealthCategoryLabel(c: WealthCategory): string {
  return WEALTH_CATEGORIES.find((x) => x.value === c)?.label ?? c;
}

export interface ReconciliationInput {
  opening_wealth: number;
  closing_wealth: number;
  income_salary: number;
  income_property: number;
  income_business: number;
  income_capital_gains: number;
  income_other_sources: number;
  income_exempt: number;
  income_final_fixed: number;
  inflow_gifts: number;
  inflow_inheritance: number;
  inflow_loans: number;
  inflow_foreign_remittance: number;
  inflow_other: number;
  personal_expenses: number;
  other_outflows: number;
}

export interface WealthItemLike {
  category: WealthCategory;
  cost: number;
  is_cash_equivalent: boolean;
}

export interface Reconciliation {
  declaredIncome: number;
  otherInflows: number;
  outflows: number;
  expectedClosing: number;
  closing: number;
  closingFromStatement: boolean;
  assets: number;
  liabilities: number;
  cashEquivalents: number;
  gap: number;
}

const n = (v: unknown) => Number(v ?? 0) || 0;

/**
 * Mirrors IRIS wealth reconciliation (and the SQL in v_client_tax_years):
 * expected closing = opening + declared income + exempt + final/fixed + other inflows
 *                    - personal expenses - other outflows
 * gap = closing net assets - expected closing (closing from the wealth statement when it has lines).
 */
export function reconcile(input: ReconciliationInput, items: WealthItemLike[] = []): Reconciliation {
  const declaredIncome =
    n(input.income_salary) + n(input.income_property) + n(input.income_business) +
    n(input.income_capital_gains) + n(input.income_other_sources);
  const otherInflows =
    n(input.inflow_gifts) + n(input.inflow_inheritance) + n(input.inflow_loans) +
    n(input.inflow_foreign_remittance) + n(input.inflow_other);
  const outflows = n(input.personal_expenses) + n(input.other_outflows);
  const expectedClosing =
    n(input.opening_wealth) + declaredIncome + n(input.income_exempt) + n(input.income_final_fixed) + otherInflows - outflows;

  const assets = items.filter((i) => i.category !== "liabilities").reduce((s, i) => s + n(i.cost), 0);
  const liabilities = items.filter((i) => i.category === "liabilities").reduce((s, i) => s + n(i.cost), 0);
  const cashEquivalents = items
    .filter((i) => i.category !== "liabilities" && i.is_cash_equivalent)
    .reduce((s, i) => s + n(i.cost), 0);
  const closingFromStatement = items.length > 0;
  const closing = closingFromStatement ? assets - liabilities : n(input.closing_wealth);

  return {
    declaredIncome, otherInflows, outflows, expectedClosing, closing, closingFromStatement,
    assets, liabilities, cashEquivalents, gap: Math.round((closing - expectedClosing) * 100) / 100,
  };
}

export function isGapFlagged(gap: number, threshold: number): boolean {
  return Math.abs(gap) > threshold;
}
