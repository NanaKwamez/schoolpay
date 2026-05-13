/** Minimal structured logging sink — use instead of raw console in app code. */

export function logError(
  scope: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const normalized =
    error instanceof Error
      ? { message: error.message, name: error.name, stack: error.stack }
      : { value: error }

  console.error('[SchoolPay]', { scope, ...normalized, ...(context ?? {}) })
}
