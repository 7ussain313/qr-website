import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/getServerSession'
import { buildPayload } from '@/lib/qr/hmac'
import QRCode from 'qrcode'
import type { NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { user, profile } = await getServerSession()

  if (!user || profile?.role !== 'owner') {
    return new Response('Unauthorized', { status: 403 })
  }

  const admin = createAdminClient()

  const { data: ticket } = await admin
    .from('tickets')
    .select('id, token, attendee_name, session_id')
    .eq('id', id)
    .single()

  if (!ticket) {
    return new Response('Not found', { status: 404 })
  }

  // Verify the owner owns the session this ticket belongs to
  const { data: session } = await admin
    .from('sessions')
    .select('id')
    .eq('id', ticket.session_id)
    .eq('owner_id', user.id)
    .single()

  if (!session) {
    return new Response('Not found', { status: 404 })
  }

  const payload = await buildPayload(ticket.token)
  const buffer = await QRCode.toBuffer(payload, { type: 'png', width: 300, margin: 2 })

  const safeName = ticket.attendee_name
    ? ticket.attendee_name.replace(/[^a-z0-9]/gi, '-')
    : `ticket-${id}`
  const filename = `${safeName}.png`

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
