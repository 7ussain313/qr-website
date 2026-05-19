import { getServerSession } from '@/lib/auth/getServerSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { createStaffSchema } from '@/lib/validation/staff'
import { generatePassword } from '@/lib/auth/generatePassword'
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

  const parsed = createStaffSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { email, full_name, session_id } = parsed.data
  const admin = createAdminClient()

  // Verify the session exists and belongs to this owner
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

  // Check for duplicate email
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
  }

  const password = generatePassword()

  const { data: authData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: 'scanner' },
  })

  if (createError || !authData.user) {
    return NextResponse.json({ error: createError?.message ?? 'Failed to create account' }, { status: 500 })
  }

  // Wait briefly for the DB trigger to create the profile row, then update it
  await new Promise((r) => setTimeout(r, 500))

  await admin
    .from('profiles')
    .update({ assigned_session_id: session_id, full_name })
    .eq('id', authData.user.id)

  const { data: newProfile } = await admin
    .from('profiles')
    .select('id, email, full_name, is_active, assigned_session_id')
    .eq('id', authData.user.id)
    .single()

  return NextResponse.json(
    {
      email,
      password,
      profile: newProfile,
      assigned_session: { id: session.id, name: (session as { id: string; name: string }).name },
    },
    { status: 201 }
  )
}
