import { getServerSession } from '@/lib/auth/getServerSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, profile } = await getServerSession(request)
  if (!user || !profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const admin = createAdminClient()

  // Scanners may only access their assigned session
  if (profile.role === 'scanner') {
    const assigned = profile.assigned_session_id
    if (assigned !== id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
  }

  const { data, error } = await admin
    .from('tickets')
    .select('id, attendee_name, attendee_email, is_used, used_at')
    .eq('session_id', id)
    .order('attendee_name', { ascending: true, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tickets = data ?? []
  const checkedIn = tickets.filter((t) => t.is_used).length

  return NextResponse.json({
    tickets,
    total: tickets.length,
    checked_in: checkedIn,
    remaining: tickets.length - checkedIn,
  })
}
