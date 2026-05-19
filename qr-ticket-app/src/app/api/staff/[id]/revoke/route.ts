import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/getServerSession'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { user, profile } = await getServerSession(request)

  if (!user || profile?.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Confirm target is a scanner (owners cannot revoke other owners)
  const { data: target } = await admin
    .from('profiles')
    .select('role, is_active')
    .eq('id', id)
    .single()

  if (!target) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  const t = target as { role: string; is_active: boolean }

  if (t.role !== 'scanner') {
    return NextResponse.json({ error: 'Cannot revoke owner accounts' }, { status: 403 })
  }

  // Deactivate profile
  const { error: updateError } = await admin
    .from('profiles')
    .update({ is_active: false })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Invalidate all active sessions immediately
  const { error: signOutError } = await admin.auth.admin.signOut(id, 'global')

  if (signOutError) {
    // Profile is already deactivated — middleware will block on next request
    console.warn(`Could not sign out user ${id}:`, signOutError.message)
  }

  return NextResponse.json({ success: true })
}
