import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/getServerSession'
import { buildPayload } from '@/lib/qr/hmac'
import QRCode from 'qrcode'
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

  const payload = await buildPayload(ticket.token, ticket.attendee_name)
  const qrBuffer = await QRCode.toBuffer(payload, { type: 'png', width: 300, margin: 2 })
  const qrBase64 = Buffer.from(qrBuffer).toString('base64')

  const name = ticket.attendee_name
  const headerHeight = name ? 52 : 0
  const totalHeight = 300 + headerHeight
  const safeNameXml = name
    ? name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : ''
  const fontSize = !name ? 0 : name.length > 22 ? 13 : name.length > 14 ? 16 : 20

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="300" height="${totalHeight}">`,
    `  <rect width="300" height="${totalHeight}" fill="white"/>`,
    name ? `  <text x="150" y="26" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle" dominant-baseline="middle" fill="#111111">${safeNameXml}</text>` : '',
    `  <image href="data:image/png;base64,${qrBase64}" x="0" y="${headerHeight}" width="300" height="300"/>`,
    `</svg>`,
  ].filter(Boolean).join('\n')

  const safeName = (name ?? `ticket-${id}`).replace(/[^a-z0-9]/gi, '-')

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${safeName}.svg"`,
    },
  })
}
