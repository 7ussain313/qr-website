import { getServerSession } from '@/lib/auth/getServerSession'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { user, profile } = await getServerSession(request)
  if (!user || !profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from('sessions')
    .select('id, name, capacity')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return NextResponse.json({ sessions: data ?? [] })
}
