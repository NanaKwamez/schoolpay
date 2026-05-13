// Zod: validates PostgREST `fee_types` rows for client-side inserts/selects.
import { z } from 'zod'

const FundTypeSchema = z.enum(['feeding', 'general'])
const FeeFrequencySchema = z.enum(['daily', 'weekly', 'termly', 'once'])

export const FeeTypeRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  amount: z.number(),
  fund_type: FundTypeSchema,
  frequency: FeeFrequencySchema,
  applies_to_term: z.string().nullable(),
  is_active: z.boolean(),
  description: z.string().nullable(),
})

export type FeeTypeRow = z.infer<typeof FeeTypeRowSchema>
