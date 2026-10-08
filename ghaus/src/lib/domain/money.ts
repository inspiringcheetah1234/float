export type NumberFormat = "lakh" | "international";

function groupInteger(intPart: string, format: NumberFormat): string {
  if (format === "international") return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  // South Asian grouping: last three digits, then pairs. 123456789 -> 12,34,56,789
  if (intPart.length <= 3) return intPart;
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

/** Plain grouped number, no currency. Rounds to whole rupees unless decimals is set. */
export function formatAmount(value: number | string | null | undefined, format: NumberFormat, decimals = 0): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (!Number.isFinite(n)) return "–";
  const fixed = Math.abs(n).toFixed(decimals);
  const [intPart, frac] = fixed.split(".");
  const grouped = groupInteger(intPart, format) + (frac ? "." + frac : "");
  return (n < 0 && Number(fixed) !== 0 ? "-" : "") + grouped;
}

/** "Rs 12,34,567" / "-Rs 1,000" */
export function formatPKR(value: number | string | null | undefined, format: NumberFormat, decimals = 0): string {
  const s = formatAmount(value, format, decimals);
  if (s === "–") return s;
  return s.startsWith("-") ? `-Rs ${s.slice(1)}` : `Rs ${s}`;
}

/** Short form for dashboards: lakh/crore or K/M/B depending on the format. */
export function formatPKRCompact(value: number | string | null | undefined, format: NumberFormat): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (!Number.isFinite(n)) return "–";
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  const trim = (x: number) => x.toFixed(x >= 100 ? 0 : x >= 10 ? 1 : 2).replace(/\.?0+$/, "");
  if (format === "lakh") {
    if (a >= 1e7) return `${sign}Rs ${trim(a / 1e7)} crore`;
    if (a >= 1e5) return `${sign}Rs ${trim(a / 1e5)} lakh`;
    return formatPKR(n, format);
  }
  if (a >= 1e9) return `${sign}Rs ${trim(a / 1e9)}B`;
  if (a >= 1e6) return `${sign}Rs ${trim(a / 1e6)}M`;
  if (a >= 1e3) return `${sign}Rs ${trim(a / 1e3)}K`;
  return formatPKR(n, format);
}

/** Parses user input like "12,34,567", "Rs 1,000.50", "(5,000)". Empty -> 0. Invalid -> null. */
export function parseAmount(input: string): number | null {
  const s = input.trim();
  if (s === "") return 0;
  const negative = /^\(.*\)$/.test(s) || s.startsWith("-");
  const cleaned = s.replace(/rs\.?/i, "").replace(/[(),\s-]/g, "");
  if (!/^\d*(\.\d{0,2})?$/.test(cleaned) || cleaned === "" || cleaned === ".") return null;
  const n = Number(cleaned);
  return negative ? -n : n;
}
