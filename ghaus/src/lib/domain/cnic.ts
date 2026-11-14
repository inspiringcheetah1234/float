export const CNIC_PATTERN = /^\d{5}-\d{7}-\d$/;

export function isValidCnic(value: string): boolean {
  return CNIC_PATTERN.test(value);
}

/** Accepts "3520212345671", "35202 1234567 1" or already formatted input. Returns null if not 13 digits. */
export function formatCnic(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 13) return null;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}
