import { z } from 'zod'

export const inviteStaffSchema = z.object({
  email: z.string().email('Invalid email address'),
  expires_in_hours: z.number().int().min(1).max(168).default(48),
  session_id: z.string().uuid().optional().nullable(),
}).strict()

export const acceptInviteSchema = z.object({
  token: z.string().uuid('Invalid invite token'),
  full_name: z.string().min(1, 'Full name is required').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters'),
}).strict()

export type InviteStaffInput = z.infer<typeof inviteStaffSchema>
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>
