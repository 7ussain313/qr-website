import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/getServerSession'
import { buildPayload } from '@/lib/qr/hmac'
import QRCode from 'qrcode'
import JSZip from 'jszip'
import type { NextRequest } from 'next/server'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildSvgCard(qrBase64: string, name: string | null): Buffer {
  const hasName = !!name
  const totalHeight = hasName ? 330 : 280
  const fontSize = !hasName ? 0 : name!.length > 22 ? 13 : name!.length > 14 ? 16 : 20
  const qrY = hasName ? 50 : 10

  const nameEl = hasName
    ? `<text x="150" y="32" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="bold" fill="#111111">${escapeXml(name!)}</text>`
    : ''

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="300" height="${totalHeight}">
  <rect width="300" height="${totalHeight}" fill="white"/>
  ${nameEl}
  <image href="data:image/png;base64,${qrBase64}" x="20" y="${qrY}" width="260" height="260"/>
</svg>`

  return Buffer.from(svg, 'utf8')
}

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
      const qrBuffer = await QRCode.toBuffer(payload, { type: 'png', width: 260, margin: 2 })
      const qrBase64 = Buffer.from(qrBuffer).toString('base64')

      const svgBuffer = buildSvgCard(qrBase64, ticket.attendee_name)
      const index = String(i + 1).padStart(String(tickets.length).length, '0')
      const label = ticket.attendee_name
        ? ticket.attendee_name.replace(/[^a-z0-9]/gi, '-')
        : ticket.id
      zip.file(`${index}-${label}.svg`, svgBuffer)
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
