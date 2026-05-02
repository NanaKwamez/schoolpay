/** Validate Ghana phone numbers: starts with 0, exactly 10 digits */
export function isValidGhanaPhone(phone: string): boolean {
  return /^0[0-9]{9}$/.test(phone.trim())
}

/** Validate a positive money amount */
export function isValidAmount(value: string): boolean {
  const n = parseFloat(value)
  return !isNaN(n) && n > 0
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
    : 'border-gray-200 focus:border-morning-green-500'
}
