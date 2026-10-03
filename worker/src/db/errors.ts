// Drizzle wraps D1 errors, so the constraint message is on the error's cause.
export function isUniqueViolation(e: unknown): boolean {
  for (let err = e; err; err = (err as { cause?: unknown }).cause) {
    if (String((err as Error).message ?? err).includes('UNIQUE constraint failed')) return true
  }
  return false
}
