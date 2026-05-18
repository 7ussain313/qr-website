export const APP_NAME = 'QR Ticket App'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const ROLES = {
  OWNER: 'owner',
  SCANNER: 'scanner',
} as const

export const SCAN_RATE_LIMIT = 30 // requests per minute per scanner
export const LOGIN_RATE_LIMIT = 5 // attempts per minute per IP

export const INVITATION_EXPIRY_HOURS = 48
