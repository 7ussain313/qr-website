import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loginSchema } from '@/lib/validation/auth'
import { checkRateLimit } from '@/lib/rate-limit'
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
  const ip = getClientIp(request)

  if (!checkRateLimit(`login:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please wait 60 seconds.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid input'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { email, password } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }

  // Force session flush to cookies before any response is sent
  await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, is_active')
    .eq('id', data.user.id)
    .single()

  const role = (profile as { role?: string; is_active?: boolean } | null)?.role ?? 'owner'
  const isActive = (profile as { role?: string; is_active?: boolean } | null)?.is_active ?? true

  if (!isActive) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'Account suspended. Contact your administrator.' }, { status: 403 })
  }

  return NextResponse.json({ role })
}
