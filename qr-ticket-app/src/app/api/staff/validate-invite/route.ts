import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ valid: false })
  }

  const admin = createAdminClient()

  const { data } = await admin
    .from('staff_invitations')
    .select('email, accepted_at, expires_at')
    .eq('token', token)
    .single()

  if (!data) return NextResponse.json({ valid: false })

  const inv = data as { email: string; accepted_at: string | null; expires_at: string }

  if (inv.accepted_at || new Date(inv.expires_at) < new Date()) {
    return NextResponse.json({ valid: false })
  }

  return NextResponse.json({ valid: true, email: inv.email })
}
