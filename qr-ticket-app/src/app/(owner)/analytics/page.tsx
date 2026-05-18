'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart2, Users, CheckCircle2, QrCode } from 'lucide-react'
import { StatsCard } from '@/components/analytics/StatsCard'
import { AttendanceChart } from '@/components/analytics/AttendanceChart'
import { ScanLogTable, type ScanLogEntry } from '@/components/analytics/ScanLogTable'

interface Session {
  id: string
  name: string
}

interface SessionAnalytics {
  session_name: string
  capacity: number
  total_tickets: number
  total_scanned: number
  attendance_rate: number
  scans_by_hour: { hour: string; count: number }[]
  top_scanners: { id: string; name: string | null; count: number }[]
  scan_logs: ScanLogEntry[]
}

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sessions')
      .then((r) => r.json())
      .then((d: Session[]) => {
        setSessions(d)
        if (d.length > 0) setSelectedId(d[0]?.id ?? '')
      })
      .finally(() => setSessionsLoading(false))
  }, [])

  const loadAnalytics = useCallback((id: string) => {
    if (!id) return
    setLoading(true)
    setAnalytics(null)
    fetch(`/api/analytics/sessions/${id}`)
      .then((r) => r.json())
      .then((d: SessionAnalytics) => setAnalytics(d))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedId) loadAnalytics(selectedId)
  }, [selectedId, loadAnalytics])

  return (
    <>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Attendance and scan history by session</p>
        </div>

        {/* Session picker */}
        {sessionsLoading ? (
          <div className="h-9 w-52 animate-pulse rounded-lg bg-gray-100" />
        ) : (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {sessions.length === 0 && (
              <option value="">No sessions</option>
            )}
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Stats row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Capacity"
          value={analytics?.capacity ?? 0}
          icon={QrCode}
          color="purple"
          loading={loading}
        />
        <StatsCard
          label="Tickets Generated"
          value={analytics?.total_tickets ?? 0}
          icon={QrCode}
          color="blue"
          loading={loading}
        />
        <StatsCard
          label="Attended"
          value={analytics?.total_scanned ?? 0}
          icon={CheckCircle2}
          color="green"
          loading={loading}
        />
        <StatsCard
          label="Attendance Rate"
          value={analytics ? `${analytics.attendance_rate}%` : '0%'}
          icon={BarChart2}
          color="yellow"
          loading={loading}
        />
      </div>

      {/* Chart + top scanners */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Scans over time */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-gray-900">Scans Over Time</h2>
          {loading ? (
            <div className="h-56 animate-pulse rounded-lg bg-gray-100" />
          ) : (
            <AttendanceChart data={analytics?.scans_by_hour ?? []} />
          )}
        </div>

        {/* Top scanners */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-gray-900">Top Scanners</h2>
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          )}
          {!loading && (analytics?.top_scanners.length ?? 0) === 0 && (
            <p className="text-sm text-gray-400">No scans yet</p>
          )}
          {!loading && (
            <div className="space-y-2">
              {analytics?.top_scanners.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                    {i + 1}
                  </span>
                  <div className="flex flex-1 items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm text-gray-700">{s.name ?? 'Unknown'}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{s.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scan log table */}
      {!loading && analytics && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-gray-900">
            Scan History{' '}
            <span className="text-sm font-normal text-gray-400">
              ({analytics.scan_logs.length} records)
            </span>
          </h2>
          <ScanLogTable logs={analytics.scan_logs} sessionName={analytics.session_name} />
        </div>
      )}
    </>
  )
}
