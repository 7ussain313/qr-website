import { getServerSession } from '@/lib/auth/getServerSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { user, profile } = await getServerSession(request)
  if (!user || !profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = createAdminClient()

  // If scanner, fetch the assigned session name too
  let assignedSession: { id: string; name: string } | null = null
  const sessionId = profile.assigned_session_id
  if (sessionId) {
    const { data } = await admin
      .from('sessions')
      .select('id, name')
      .eq('id', sessionId)
      .single()
    if (data) assignedSession = data as { id: string; name: string }
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    full_name: profile.full_name,
    role: profile.role,
    assigned_session_id: sessionId,
    assigned_session: assignedSession,
  })
}
