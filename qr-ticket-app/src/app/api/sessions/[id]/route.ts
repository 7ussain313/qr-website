import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/getServerSession'
import { updateSessionSchema } from '@/lib/validation/sessions'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

async function assertOwnsSession(userId: string, sessionId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('owner_id', userId)
    .single()
  return !!data
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { user, profile } = await getServerSession()

  if (!user || profile?.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sessions')
    .select('*, tickets(*)')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  return NextResponse.json({ session: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { user, profile } = await getServerSession()

  if (!user || profile?.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (!(await assertOwnsSession(user.id, id))) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = updateSessionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('sessions')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ session: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { user, profile } = await getServerSession()

  if (!user || profile?.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (!(await assertOwnsSession(user.id, id))) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Soft-delete — never hard-delete (audit trail must be preserved)
  const admin = createAdminClient()

  const { error } = await admin
    .from('sessions')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
