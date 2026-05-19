import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/getServerSession'
import { buildPayload } from '@/lib/qr/hmac'
import QRCode from 'qrcode'
import JSZip from 'jszip'
import type { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { user, profile } = await getServerSession(request)

  if (!user || profile?.role !== 'owner') {
    return new Response('Unauthorized', { status: 403 })
  }

  const admin = createAdminClient()

  const { data: session } = await admin
    .from('sessions')
    .select('id, name')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!session) {
    return new Response('Not found', { status: 404 })
  }

  const { data: tickets, error } = await admin
    .from('tickets')
    .select('id, token, attendee_name')
    .eq('session_id', id)
    .order('created_at')

  if (error) {
    return new Response('Failed to fetch tickets', { status: 500 })
  }

  if (!tickets || tickets.length === 0) {
    return new Response('No tickets to export', { status: 404 })
  }

  const zip = new JSZip()

  await Promise.all(
    tickets.map(async (ticket, i) => {
      const payload = await buildPayload(ticket.token, ticket.attendee_name)
      const buffer = await QRCode.toBuffer(payload, { type: 'png', width: 300, margin: 2 })
      const index = String(i + 1).padStart(String(tickets.length).length, '0')
      const label = ticket.attendee_name
        ? ticket.attendee_name.replace(/[^a-z0-9]/gi, '-')
        : ticket.id
      zip.file(`${index}-${label}.png`, buffer)
    })
  )

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
  const sessionSlug = session.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()

  return new Response(new Uint8Array(zipBuffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${sessionSlug}-tickets.zip"`,
    },
  })
}
