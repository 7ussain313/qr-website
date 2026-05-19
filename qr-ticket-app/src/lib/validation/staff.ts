import { z } from 'zod'

export const createStaffSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(1, 'Full name is required').max(100),
  session_id: z.string().uuid('Session is required'),
}).strict()

export const assignStaffSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
}).strict()

export type CreateStaffInput = z.infer<typeof createStaffSchema>
export type AssignStaffInput = z.infer<typeof assignStaffSchema>
