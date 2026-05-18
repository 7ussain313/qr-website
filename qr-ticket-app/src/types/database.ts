// Auto-generated shape matching the Phase 4 schema.
// Regenerate after schema changes:
//   supabase gen types typescript --linked > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'owner' | 'scanner'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'owner' | 'scanner'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'owner' | 'scanner'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
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
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          capacity: number
          starts_at?: string | null
          ends_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          capacity?: number
          starts_at?: string | null
          ends_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      tickets: {
        Row: {
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
        Insert: {
          id?: string
          session_id: string
          token?: string
          attendee_name?: string | null
          attendee_email?: string | null
          is_used?: boolean
          used_at?: string | null
          scanned_by?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          token?: string
          attendee_name?: string | null
          attendee_email?: string | null
          is_used?: boolean
          used_at?: string | null
          scanned_by?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      scan_logs: {
        Row: {
          id: string
          ticket_id: string
          session_id: string
          scanned_by: string
          scan_result: 'success' | 'already_used' | 'expired' | 'not_found'
          scanned_at: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          ticket_id: string
          session_id: string
          scanned_by: string
          scan_result: 'success' | 'already_used' | 'expired' | 'not_found'
          scanned_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          ticket_id?: string
          session_id?: string
          scanned_by?: string
          scan_result?: 'success' | 'already_used' | 'expired' | 'not_found'
          scanned_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_logs_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      staff_invitations: {
        Row: {
          id: string
          email: string
          invited_by: string
          session_id: string | null
          token: string
          accepted_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          invited_by: string
          session_id?: string | null
          token?: string
          accepted_at?: string | null
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          invited_by?: string
          session_id?: string | null
          token?: string
          accepted_at?: string | null
          expires_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      validate_ticket: {
        Args: { p_token: string; p_scanner_id: string }
        Returns: Json
      }
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
