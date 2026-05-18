import { z } from 'zod'

export const createSessionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1'),
  starts_at: z.string().datetime({ offset: true }).optional().nullable(),
  ends_at: z.string().datetime({ offset: true }).optional().nullable(),
})

export const updateSessionSchema = createSessionSchema.partial()

export type CreateSessionInput = z.infer<typeof createSessionSchema>
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>
