import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/getServerSession'
import { buildPayload } from '@/lib/qr/hmac'
import { ImageResponse } from 'next/og'
import QRCode from 'qrcode'
import JSZip from 'jszip'
import React from 'react'
import fs from 'fs'
import path from 'path'
import type { NextRequest } from 'next/server'

let fontCache: ArrayBuffer | null = null

function getFont(): ArrayBuffer {
  if (fontCache) return fontCache
  const buf = fs.readFileSync(
    path.join(process.cwd(), 'public', 'fonts', 'NotoNaskhArabic-Regular.ttf')
  )
  fontCache = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  return fontCache
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

  const fontData = getFont()
  const zip = new JSZip()

  for (const [i, ticket] of tickets.entries()) {
    const payload = await buildPayload(ticket.token, ticket.attendee_name)
    const qrBuffer = await QRCode.toBuffer(payload, { type: 'png', width: 260, margin: 2 })
    const qrBase64 = Buffer.from(qrBuffer).toString('base64')
    const qrDataUrl = `data:image/png;base64,${qrBase64}`

    const name = ticket.attendee_name
    const totalHeight = name ? 330 : 280
    const fontSize = !name ? 0 : name.length > 22 ? 13 : name.length > 14 ? 16 : 20

    const imageResponse = new ImageResponse(
      React.createElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'white',
            width: '300px',
            height: `${totalHeight}px`,
            padding: '16px',
            gap: '10px',
          },
        },
        name
          ? React.createElement(
              'div',
              {
                style: {
                  fontSize,
                  fontWeight: 'bold',
                  fontFamily: 'NotoNaskhArabic',
                  textAlign: 'center',
                  color: '#111111',
                  maxWidth: '268px',
                  direction: 'rtl',
                },
              },
              name
            )
          : null,
        React.createElement('img', { src: qrDataUrl, width: 260, height: 260 })
      ),
      {
        width: 300,
        height: totalHeight,
        fonts: [
          {
            name: 'NotoNaskhArabic',
            data: fontData,
            weight: 400,
            style: 'normal',
          },
        ],
      }
    )

    const buffer = Buffer.from(await imageResponse.arrayBuffer())
    const index = String(i + 1).padStart(String(tickets.length).length, '0')
    const label = name ? name.replace(/[^a-z0-9]/gi, '-') : ticket.id
    zip.file(`${index}-${label}.png`, buffer)
  }

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
