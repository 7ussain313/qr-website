import { createClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/getServerSession'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { user, profile } = await getServerSession(request)

  if (!user || profile?.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const supabase = await createClient()

  // Fetch all scanner profiles with their last scan timestamp
  const { data: staff, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, is_active, created_at')
    .eq('role', 'scanner')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch last scan per staff member
  const staffIds = (staff ?? []).map((s: { id: string }) => s.id)
  let lastScans: Record<string, string> = {}

  if (staffIds.length > 0) {
    const { data: logs } = await supabase
      .from('scan_logs')
      .select('scanned_by, scanned_at')
      .in('scanned_by', staffIds)
      .order('scanned_at', { ascending: false })

    // Keep only the latest scan per staff member
    for (const log of logs ?? []) {
      const l = log as { scanned_by: string; scanned_at: string }
      if (!lastScans[l.scanned_by]) {
        lastScans[l.scanned_by] = l.scanned_at
      }
    }
  }

  const result = (staff ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    last_scan_at: lastScans[s.id as string] ?? null,
  }))

  return NextResponse.json({ staff: result })
}
