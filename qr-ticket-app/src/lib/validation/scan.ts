import { z } from 'zod'

export const scanRequestSchema = z.object({
  payload: z.string().min(1, 'Payload is required'),
})

// Shape embedded in every QR code
export const qrPayloadSchema = z.object({
  v: z.number(),
  t: z.string().uuid('Invalid ticket token'),
})

export type ScanRequest = z.infer<typeof scanRequestSchema>
