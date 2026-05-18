import { createAdminClient } from '@/lib/supabase/admin'
import { acceptInviteSchema } from '@/lib/validation/staff'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = acceptInviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { token, full_name, password } = parsed.data
  const admin = createAdminClient()

  // Validate invitation token
  const { data: invitation } = await admin
    .from('staff_invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (!invitation) {
    return NextResponse.json({ error: 'Invalid or expired invite link.' }, { status: 400 })
  }

  const inv = invitation as {
    email: string
    accepted_at: string | null
    expires_at: string
    id: string
  }

  if (inv.accepted_at) {
    return NextResponse.json({ error: 'This invite has already been used.' }, { status: 400 })
  }

  if (new Date(inv.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite link has expired.' }, { status: 400 })
  }

  // Create auth user with scanner role in metadata (handle_new_user trigger reads this)
  const { data: authData, error: createError } = await admin.auth.admin.createUser({
    email: inv.email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: 'scanner' },
  })

  if (createError || !authData.user) {
    return NextResponse.json(
      { error: createError?.message ?? 'Failed to create account.' },
      { status: 500 }
    )
  }

  // Mark invitation as accepted
  await admin
    .from('staff_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', inv.id)

  return NextResponse.json({ success: true })
}
