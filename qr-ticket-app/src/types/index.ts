export type { Database } from './database'

export type UserRole = 'owner' | 'scanner'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  owner_id: string
  name: string
  description: string | null
  capacity: number
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  session_id: string
  token: string
  attendee_name: string | null
  attendee_email: string | null
  is_used: boolean
  used_at: string | null
  scanned_by: string | null
  expires_at: string | null
  created_at: string
}

export interface ScanLog {
  id: string
  ticket_id: string
  session_id: string
  scanned_by: string
  scan_result: 'success' | 'already_used' | 'expired' | 'not_found'
  scanned_at: string
  ip_address: string | null
  user_agent: string | null
}

export interface StaffInvitation {
  id: string
  email: string
  invited_by: string
  session_id: string | null
  token: string
  accepted_at: string | null
  expires_at: string
  created_at: string
}

export interface ValidateTicketResult {
  valid: boolean
  reason?: 'already_used' | 'expired' | 'not_found'
  attendee_name?: string
  session_name?: string
  used_at?: string
}
