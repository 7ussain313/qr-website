'use client'

import { useEffect, useState } from 'react'
import React from 'react'
import Link from 'next/link'
import { CalendarDays, Users, BarChart2, QrCode, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { StatsCard } from '@/components/analytics/StatsCard'
import { RealtimeCounter } from '@/components/analytics/RealtimeCounter'
import { formatDate } from '@/lib/utils'

interface DashboardData {
  total_sessions: number
  total_tickets: number
  scanned_today: number
  active_scanners: number
  recent_scans: {
    id: string
    scan_result: string
    scanned_at: string
    attendee_name: string | null
    scanner_name: string | null
  }[]
}

const resultIcon: Record<string, React.ReactElement> = {
  success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  already_used: <XCircle className="h-4 w-4 text-red-500" />,
  expired: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  not_found: <XCircle className="h-4 w-4 text-gray-400" />,
}

const resultLabel: Record<string, string> = {
  success: 'Valid',
  already_used: 'Already Used',
  expired: 'Expired',
  not_found: 'Not Found',
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d: DashboardData) => setData(d))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Welcome back. Here's what's happening.</p>
        </div>
        {data && <RealtimeCounter initialCount={data.scanned_today} />}
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total Sessions"
          value={data?.total_sessions ?? 0}
          icon={CalendarDays}
          color="blue"
          loading={loading}
        />
        <StatsCard
          label="Total Tickets"
          value={data?.total_tickets ?? 0}
          icon={QrCode}
          color="purple"
          loading={loading}
        />
        <StatsCard
          label="Scanned Today"
          value={data?.scanned_today ?? 0}
          icon={CheckCircle2}
          color="green"
          loading={loading}
        />
        <StatsCard
          label="Active Scanners"
          value={data?.active_scanners ?? 0}
          icon={Users}
          color="yellow"
          loading={loading}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent scans */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-gray-900">Recent Scans</h2>
            <Link href="/analytics" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading && (
              <div className="px-5 py-10 text-center text-sm text-gray-400">Loading…</div>
            )}
            {!loading && (data?.recent_scans.length ?? 0) === 0 && (
              <div className="px-5 py-10 text-center text-sm text-gray-400">No scans yet</div>
            )}
            {data?.recent_scans.map((scan) => (
              <div key={scan.id} className="flex items-center gap-3 px-5 py-3">
                {resultIcon[scan.scan_result] ?? null}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {scan.attendee_name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-400">
                    by {scan.scanner_name ?? '—'} · {formatDate(scan.scanned_at)}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {resultLabel[scan.scan_result] ?? scan.scan_result}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="flex flex-col gap-3">
          {[
            { href: '/sessions', icon: CalendarDays, label: 'Sessions', description: 'Manage event sessions' },
            { href: '/staff', icon: Users, label: 'Staff', description: 'Manage scanner accounts' },
            { href: '/analytics', icon: BarChart2, label: 'Analytics', description: 'Attendance & scan history' },
          ].map(({ href, icon: Icon, label, description }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <Icon className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
