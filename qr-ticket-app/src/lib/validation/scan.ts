import { z } from 'zod'

export const scanRequestSchema = z.object({
  payload: z.string().min(1, 'Payload is required'),
}).strict()

export type ScanRequest = z.infer<typeof scanRequestSchema>
