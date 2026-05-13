// Resolves `fund_type` from PostgREST `fee_types` embeds (object or single-element array).

export function fundTypeFromFeeTypesEmbed(embed: unknown): string | undefined {
  const row = Array.isArray(embed) ? embed[0] : embed
  if (row == null || typeof row !== 'object' || !('fund_type' in row)) return undefined
  const v = (row as { fund_type: unknown }).fund_type
  return typeof v === 'string' ? v : undefined
}
