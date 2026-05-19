import { createAdminClient } from '@/lib/supabase/admin'
import { getServerSession } from '@/lib/auth/getServerSession'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

type RawScanLog = {
  id: string
  scan_result: string
  scanned_at: string
  ip_address: string | null
  scanned_by: string
  tickets: { attendee_name: string | null } | null
  profiles: { full_name: string | null } | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, profile } = await getServerSession(request)

  if (!user || !profile || profile.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id: sessionId } = await params
  const admin = createAdminClient()

  // Verify ownership
  const { data: session } = await admin
    .from('sessions')
    .select('id, name, capacity, owner_id')
    .eq('id', sessionId)
    .single()

  if (!session || session.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const [ticketsRes, scannedRes, logsRes] = await Promise.all([
    admin
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId),
    admin
      .from('scan_logs')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('scan_result', 'success'),
    admin
      .from('scan_logs')
      .select(`
        id, scan_result, scanned_at, ip_address, scanned_by,
        tickets!scan_logs_ticket_id_fkey ( attendee_name ),
        profiles!scan_logs_scanned_by_fkey ( full_name )
      `)
      .eq('session_id', sessionId)
      .order('scanned_at', { ascending: false })
      .limit(500),
  ])

  const totalTickets = ticketsRes.count ?? 0
  const totalScanned = scannedRes.count ?? 0
  const logs = (logsRes.data as unknown as RawScanLog[]) ?? []

  // Scans by hour bucket
  const byHour: Record<string, number> = {}
  for (const log of logs) {
    if (log.scan_result !== 'success') continue
    const hour = new Date(log.scanned_at).toISOString().slice(0, 13) + ':00'
    byHour[hour] = (byHour[hour] ?? 0) + 1
  }
  const scans_by_hour = Object.entries(byHour)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, count]) => ({ hour, count }))

  // Top scanners
  const scannerCounts: Record<string, { name: string | null; count: number }> = {}
  for (const log of logs) {
    if (log.scan_result !== 'success') continue
    const id = log.scanned_by
    if (!scannerCounts[id]) {
      scannerCounts[id] = { name: log.profiles?.full_name ?? null, count: 0 }
    }
    scannerCounts[id]!.count++
  }
  const top_scanners = Object.entries(scannerCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([id, { name, count }]) => ({ id, name, count }))

  return NextResponse.json({
    session_name: session.name,
    capacity: session.capacity,
    total_tickets: totalTickets,
    total_scanned: totalScanned,
    attendance_rate: totalTickets > 0 ? Math.round((totalScanned / totalTickets) * 100) : 0,
    scans_by_hour,
    top_scanners,
    scan_logs: logs.map((l) => ({
      id: l.id,
      scan_result: l.scan_result,
      scanned_at: l.scanned_at,
      ip_address: l.ip_address,
      attendee_name: l.tickets?.attendee_name ?? null,
      scanner_name: l.profiles?.full_name ?? null,
    })),
  })
}
