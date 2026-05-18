import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/getServerSession'
import { NextResponse } from 'next/server'

type RawScanLog = {
  id: string
  scan_result: string
  scanned_at: string
  ip_address: string | null
  scanned_by: string
  tickets: { attendee_name: string | null } | null
  profiles: { full_name: string | null } | null
}

export async function GET() {
  const { user, profile } = await getServerSession()

  if (!user || !profile || profile.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const admin = createAdminClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  const [sessionsRes, ticketsRes, scannedTodayRes, scannersRes, recentRes] = await Promise.all([
    admin.from('sessions').select('id', { count: 'exact', head: true }),
    admin.from('tickets').select('id', { count: 'exact', head: true }),
    admin
      .from('scan_logs')
      .select('id', { count: 'exact', head: true })
      .eq('scan_result', 'success')
      .gte('scanned_at', todayISO),
    admin
      .from('scan_logs')
      .select('scanned_by')
      .gte('scanned_at', todayISO)
      .limit(500),
    admin
      .from('scan_logs')
      .select(`
        id, scan_result, scanned_at, ip_address, scanned_by,
        tickets!scan_logs_ticket_id_fkey ( attendee_name ),
        profiles!scan_logs_scanned_by_fkey ( full_name )
      `)
      .order('scanned_at', { ascending: false })
      .limit(10),
  ])

  const activeScannersSet = new Set(
    (scannersRes.data ?? []).map((r) => (r as { scanned_by: string }).scanned_by)
  )

  const recentLogs = (recentRes.data as unknown as RawScanLog[]) ?? []

  return NextResponse.json({
    total_sessions: sessionsRes.count ?? 0,
    total_tickets: ticketsRes.count ?? 0,
    scanned_today: scannedTodayRes.count ?? 0,
    active_scanners: activeScannersSet.size,
    recent_scans: recentLogs.map((l) => ({
      id: l.id,
      scan_result: l.scan_result,
      scanned_at: l.scanned_at,
      attendee_name: l.tickets?.attendee_name ?? null,
      scanner_name: l.profiles?.full_name ?? null,
    })),
  })
}
