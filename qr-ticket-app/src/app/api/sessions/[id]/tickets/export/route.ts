import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/getServerSession'
import { buildPayload } from '@/lib/qr/hmac'
import { ImageResponse } from 'next/og'
import QRCode from 'qrcode'
import JSZip from 'jszip'
import React from 'react'
import { NOTO_ARABIC_B64 } from '@/lib/fonts'
import type { NextRequest } from 'next/server'

function getFontData(): ArrayBuffer {
  const buf = Buffer.from(NOTO_ARABIC_B64, 'base64')
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

async function renderCard(qrDataUrl: string, name: string | null, fontData: ArrayBuffer): Promise<Buffer> {
  const words = name ? name.trim().split(/\s+/) : []
  const totalHeight = name ? 330 : 280
  const fontSize = !name ? 0 : name.length > 22 ? 13 : name.length > 14 ? 16 : 20

  const ir = new ImageResponse(
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
      words.length > 0
        ? React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'row',
                direction: 'ltr',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '5px',
                maxWidth: '268px',
              },
            },
            ...words.map((word, i) =>
              React.createElement(
                'span',
                {
                  key: i,
                  style: {
                    fontSize,
                    fontWeight: 'bold',
                    fontFamily: 'NotoSansArabic',
                    color: '#111111',
                    direction: 'rtl',
                  },
                },
                word,
              ),
            ),
          )
        : null,
      React.createElement('img', { src: qrDataUrl, width: 260, height: 260 })
    ),
    {
      width: 300,
      height: totalHeight,
      fonts: [{ name: 'NotoSansArabic', data: fontData, weight: 400, style: 'normal' }],
    }
  )

  const reader = ir.body!.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)))
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    return await handleExport(request, params)
  } catch (err: unknown) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
    return new Response(msg, { status: 500, headers: { 'Content-Type': 'text/plain' } })
  }
}

async function handleExport(
  request: NextRequest,
  params: Promise<{ id: string }>
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

  const fontData = getFontData()
  const zip = new JSZip()
  const padLen = String(tickets.length).length

  for (const [i, ticket] of tickets.entries()) {
    const payload = await buildPayload(ticket.token, ticket.attendee_name)
    const qrBuffer = await QRCode.toBuffer(payload, { type: 'png', width: 260, margin: 2 })
    const qrDataUrl = `data:image/png;base64,${qrBuffer.toString('base64')}`

    const pngBuffer = await renderCard(qrDataUrl, ticket.attendee_name, fontData)
    const index = String(i + 1).padStart(padLen, '0')
    const label = ticket.attendee_name?.replace(/[^a-z0-9]/gi, '-') ?? ticket.id
    zip.file(`${index}-${label}.png`, pngBuffer)
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
