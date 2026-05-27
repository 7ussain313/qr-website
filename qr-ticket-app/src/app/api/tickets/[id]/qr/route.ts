import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/getServerSession'
import { buildPayload } from '@/lib/qr/hmac'
import { ImageResponse } from 'next/og'
import QRCode from 'qrcode'
import React from 'react'
import { NOTO_ARABIC_B64 } from '@/lib/fonts'
import type { NextRequest } from 'next/server'

function getFontData(): ArrayBuffer {
  const buf = Buffer.from(NOTO_ARABIC_B64, 'base64')
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
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

  const { data: ticket } = await admin
    .from('tickets')
    .select('id, token, attendee_name, session_id')
    .eq('id', id)
    .single()

  if (!ticket) {
    return new Response('Not found', { status: 404 })
  }

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
  const qrBuffer = await QRCode.toBuffer(payload, { type: 'png', width: 260, margin: 2 })
  const qrDataUrl = `data:image/png;base64,${qrBuffer.toString('base64')}`

  const name = ticket.attendee_name
  // Reverse word order before RTL rendering: satori's RTL pass re-reverses it back
  // to logical reading order, so "فاطمة عبدالله" appears left-to-right as expected.
  const displayName = name ? name.split(' ').reverse().join(' ') : null
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
      displayName
        ? React.createElement('div', {
            style: {
              fontSize,
              fontWeight: 'bold',
              fontFamily: 'NotoSansArabic',
              textAlign: 'center',
              color: '#111111',
              maxWidth: '268px',
              direction: 'rtl',
            },
          }, displayName)
        : null,
      React.createElement('img', { src: qrDataUrl, width: 260, height: 260 })
    ),
    {
      width: 300,
      height: totalHeight,
      fonts: [{ name: 'NotoSansArabic', data: getFontData(), weight: 400, style: 'normal' }],
    }
  )

  const buffer = await imageResponse.arrayBuffer()
  const safeName = (name ?? `ticket-${id}`).replace(/[^a-z0-9]/gi, '-')

  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${safeName}.png"`,
    },
  })
}
