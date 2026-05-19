import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/getServerSession'
import { scanRequestSchema } from '@/lib/validation/scan'
import { checkRateLimit } from '@/lib/rate-limit'
import { verifyPayload } from '@/lib/qr/hmac'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(request: NextRequest) {
  const { user, profile } = await getServerSession(request)

  if (!user || !profile || !profile.is_active) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent') ?? null

  // Per-user rate limit: 30 scans/min
  if (!checkRateLimit(`validate:user:${user.id}`, 30, 60_000)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 30 scans per minute.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  // Per-IP rate limit: 60 scans/min (secondary layer)
  if (!checkRateLimit(`validate:ip:${ip}`, 60, 60_000)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = scanRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  // Verify HMAC signature and extract token
  const verified = await verifyPayload(parsed.data.payload)
  if (!verified) {
    return NextResponse.json({ valid: false, reason: 'not_found' })
  }

  const admin = createAdminClient()

  // Scanners may only scan tickets in their assigned session
  if (profile.role === 'scanner') {
    const assigned = profile.assigned_session_id
    if (assigned) {
      const { data: ticket } = await admin
        .from('tickets')
        .select('session_id')
        .eq('token', verified.t)
        .single()
      if (ticket && (ticket as { session_id: string }).session_id !== assigned) {
        return NextResponse.json({ valid: false, reason: 'wrong_session' })
      }
    }
  }

  const { data, error } = await admin.rpc('validate_ticket', {
    p_token: verified.t,
    p_scanner_id: user.id,
    p_ip_address: ip,
    p_user_agent: userAgent,
  })

  // PostgreSQL FOR UPDATE NOWAIT lock collision (error code 55P03)
  if (error?.code === '55P03') {
    return NextResponse.json(
      { error: 'Scan collision — please try again' },
      { status: 409 }
    )
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data as Record<string, unknown>)
}
