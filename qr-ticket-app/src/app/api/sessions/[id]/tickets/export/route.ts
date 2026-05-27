import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/getServerSession'
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
    .select('id, attendee_name')
    .eq('session_id', id)
    .order('created_at')

  if (error) {
    return new Response('Failed to fetch tickets', { status: 500 })
  }

  if (!tickets || tickets.length === 0) {
    return new Response('No tickets to export', { status: 404 })
  }

  const origin = request.nextUrl.origin
  const cookieHeader = request.headers.get('cookie') ?? ''
  const zip = new JSZip()
  const padLen = String(tickets.length).length

  await Promise.all(
    tickets.map(async (ticket, i) => {
      const res = await fetch(`${origin}/api/tickets/${ticket.id}/qr`, {
        headers: { cookie: cookieHeader },
      })
      if (!res.ok) return
      const pngBuffer = Buffer.from(await res.arrayBuffer())
      const index = String(i + 1).padStart(padLen, '0')
      const label = ticket.attendee_name?.replace(/[^a-z0-9]/gi, '-') ?? ticket.id
      zip.file(`${index}-${label}.png`, pngBuffer)
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
