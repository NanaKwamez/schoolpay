/** Validate Ghana phone numbers: starts with 0, exactly 10 digits */
export function isValidGhanaPhone(phone: string): boolean {
  return /^0[0-9]{9}$/.test(phone.trim())
}

/** Validate a positive money amount */
export function isValidAmount(value: string): boolean {
  const n = parseFloat(value)
  return !isNaN(n) && n > 0
}

/** Hard ceiling on any single money amount (defence-in-depth for typos). */
export const MAX_AMOUNT_GHS = 1_000_000

export type AmountValidation =
  | { ok: true; value: number }
  | { ok: false; error: string }

/**
 * Strict amount validator for user-entered money values.
 * Use at every form boundary that writes to `payments`, `expenses`,
 * `fee_types`, or `other_income`.
 */
export function validateAmount(value: string | number): AmountValidation {
  const raw = typeof value === 'number' ? value : parseFloat((value ?? '').trim())
  if (typeof raw !== 'number' || !Number.isFinite(raw) || Number.isNaN(raw)) {
    return { ok: false, error: 'Enter a valid amount' }
  }
  if (raw <= 0) {
    return { ok: false, error: 'Amount must be greater than 0' }
  }
  if (raw > MAX_AMOUNT_GHS) {
    return { ok: false, error: `Amount cannot exceed ${MAX_AMOUNT_GHS.toLocaleString()} GHS` }
  }
  return { ok: true, value: Math.round(raw * 100) / 100 }
}

/** Validate a 4-digit PIN */
export function isValidPin(pin: string): boolean {
  return /^[0-9]{4}$/.test(pin.trim())
}

/** Validate a required text field */
export function isRequired(value: string): boolean {
  return value.trim().length > 0
}

/** Input border class — red if error, default if not */
export function fieldBorder(hasError: boolean): string {
  return hasError
    ? 'border-red-500 focus:border-red-500'
    : 'border-gray-200 focus:border-mga-green-mid'
}
