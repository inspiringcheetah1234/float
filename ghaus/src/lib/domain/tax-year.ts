// Pakistani tax year N runs 1 July (N-1) to 30 June N.

export function taxYearForDate(isoDate: string): number {
  const [y, m] = isoDate.split("-").map(Number);
  return m >= 7 ? y + 1 : y;
}

/** The season currently being filed: the last tax year that has ended. */
export function filingSeasonYear(todayIso: string): number {
  return taxYearForDate(todayIso) - 1;
}

/** "TY2026 (Jul 2025–Jun 2026)" */
export function taxYearLabel(ty: number): string {
  return `TY${ty} (Jul ${ty - 1}–Jun ${ty})`;
}

/** "TY2026" */
export function taxYearShort(ty: number): string {
  return `TY${ty}`;
}

export function taxYearStart(ty: number): string {
  return `${ty - 1}-07-01`;
}

export function taxYearEnd(ty: number): string {
  return `${ty}-06-30`;
}

/** Tax years to offer in pickers: a few back from the filing season, plus the current year. */
export function taxYearOptions(todayIso: string, back = 6): number[] {
  const current = taxYearForDate(todayIso);
  const years: number[] = [];
  for (let ty = current; ty >= current - back; ty--) years.push(ty);
  return years;
}
