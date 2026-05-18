import { z } from 'zod'

export const generateTicketsSchema = z.object({
  count: z.number().int().min(1, 'Must generate at least 1 ticket').max(1000),
  attendees: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        email: z.string().email().or(z.literal('')).optional(),
      }).strict()
    )
    .optional(),
}).strict()

export type GenerateTicketsInput = z.infer<typeof generateTicketsSchema>
