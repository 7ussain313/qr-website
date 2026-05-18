import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/getServerSession'
import { scanRequestSchema, qrPayloadSchema } from '@/lib/validation/scan'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiter — replaced with Redis in Phase 11
const rateLimitStore = new Map<string, { count: number; resetsAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(userId)

  if (!entry || entry.resetsAt <= now) {
    rateLimitStore.set(userId, { count: 1, resetsAt: now + 60_000 })
    return true
  }

  if (entry.count >= 30) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  const { user, profile } = await getServerSession()

  if (!user || !profile || !profile.is_active) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (!checkRateLimit(user.id)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 30 scans per minute.' },
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

  // Parse QR payload: { v: 1, t: "<uuid>" }
  let token: string
  try {
    const qrData = qrPayloadSchema.parse(JSON.parse(parsed.data.payload))
    token = qrData.t
  } catch {
    // Payload doesn't match expected format — treat as not_found
    return NextResponse.json({ valid: false, reason: 'not_found' })
  }

  const admin = createAdminClient()

  const { data, error } = await admin.rpc('validate_ticket', {
    p_token: token,
    p_scanner_id: user.id,
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
