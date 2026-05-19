import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/getServerSession'
import { inviteStaffSchema } from '@/lib/validation/staff'
import { INVITATION_EXPIRY_HOURS } from '@/lib/constants'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
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

  const parsed = inviteStaffSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { email, expires_in_hours = INVITATION_EXPIRY_HOURS, session_id } = parsed.data
  const admin = createAdminClient()

  // Check if this email is already an active scanner
  const { data: existing } = await admin
    .from('profiles')
    .select('id, is_active')
    .eq('email', email)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'A staff account with this email already exists.' },
      { status: 409 }
    )
  }

  const expiresAt = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString()

  const { data: invitation, error } = await admin
    .from('staff_invitations')
    .insert({
      email,
      invited_by: user.id,
      session_id: session_id ?? null,
      expires_at: expiresAt,
    })
    .select('token')
    .single()

  if (error || !invitation) {
    return NextResponse.json({ error: 'Failed to create invitation.' }, { status: 500 })
  }

  const inv = invitation as { token: string }
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${inv.token}`

  return NextResponse.json({ invite_url: inviteUrl, expires_at: expiresAt }, { status: 201 })
}
