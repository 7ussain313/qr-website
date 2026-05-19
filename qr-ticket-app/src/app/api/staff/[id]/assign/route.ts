import { getServerSession } from '@/lib/auth/getServerSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { assignStaffSchema } from '@/lib/validation/staff'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { user, profile } = await getServerSession(request)
  if (!user || profile?.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = assignStaffSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { session_id } = parsed.data
  const admin = createAdminClient()

  // Verify the target is a scanner
  const { data: target } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', id)
    .single()

  if (!target || (target as unknown as { role: string }).role !== 'scanner') {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  // Verify session belongs to this owner
  const { data: session } = await admin
    .from('sessions')
    .select('id, name')
    .eq('id', session_id)
    .eq('owner_id', user.id)
    .eq('is_active', true)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Session not found or not active' }, { status: 404 })
  }

  const { data: updated, error } = await admin
    .from('profiles')
    .update({ assigned_session_id: session_id })
    .eq('id', id)
    .select('id, email, full_name, is_active, assigned_session_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ profile: updated, assigned_session: session })
}
