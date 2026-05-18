import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/getServerSession'
import { generateTicketsSchema } from '@/lib/validation/tickets'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { user, profile } = await getServerSession()

  if (!user || profile?.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = generateTicketsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const { data: session } = await admin
    .from('sessions')
    .select('id, capacity, ends_at')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const { count: existingCount } = await admin
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', id)

  const existing = existingCount ?? 0
  const { count, attendees } = parsed.data

  if (existing + count > session.capacity) {
    return NextResponse.json(
      { error: `Only ${session.capacity - existing} tickets remaining` },
      { status: 400 }
    )
  }

  const rows = Array.from({ length: count }, (_, i) => ({
    session_id: id,
    token: crypto.randomUUID(),
    attendee_name: attendees?.[i]?.name ?? null,
    attendee_email: attendees?.[i]?.email || null,
    expires_at: session.ends_at ?? null,
  }))

  const { data: tickets, error } = await admin
    .from('tickets')
    .insert(rows)
    .select('id, attendee_name, attendee_email')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tickets }, { status: 201 })
}
