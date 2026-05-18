import { createClient } from '@/lib/supabase/server'
import { loginSchema } from '@/lib/validation/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
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

  // Fetch role from profiles table (populated in Phase 4)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', data.user.id)
    .single()

  // If profile doesn't exist yet (pre-Phase 4) default to owner for the seeded account
  const role = (profile as { role?: string; is_active?: boolean } | null)?.role ?? 'owner'
  const isActive = (profile as { role?: string; is_active?: boolean } | null)?.is_active ?? true

  if (!isActive) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'Account suspended. Contact your administrator.' }, { status: 403 })
  }

  return NextResponse.json({ role })
}
