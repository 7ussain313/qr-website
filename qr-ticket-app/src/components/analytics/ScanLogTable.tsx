'use client'

import { useState, useMemo } from 'react'
import { Search, Download, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

export interface ScanLogEntry {
  id: string
  scan_result: string
  scanned_at: string
  ip_address: string | null
  attendee_name: string | null
  scanner_name: string | null
}

const RESULT_FILTERS = ['all', 'success', 'already_used', 'expired', 'not_found'] as const
type ResultFilter = (typeof RESULT_FILTERS)[number]

const resultIcon = {
  success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  already_used: <XCircle className="h-4 w-4 text-red-500" />,
  expired: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  not_found: <XCircle className="h-4 w-4 text-gray-400" />,
}

const resultLabel = {
  success: 'Valid',
  already_used: 'Already Used',
  expired: 'Expired',
  not_found: 'Not Found',
}

const PAGE_SIZE = 50

export function ScanLogTable({ logs, sessionName }: { logs: ScanLogEntry[]; sessionName: string }) {
  const [filter, setFilter] = useState<ResultFilter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    let rows = logs
    if (filter !== 'all') rows = rows.filter((r) => r.scan_result === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.attendee_name?.toLowerCase().includes(q) ||
          r.scanner_name?.toLowerCase().includes(q)
      )
    }
    return rows
  }, [logs, filter, search])

  const pages = Math.ceil(filtered.length / PAGE_SIZE)
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function exportCSV() {
    const header = 'Time,Result,Attendee,Scanner,IP\n'
    const rows = filtered
      .map((r) =>
        [
          r.scanned_at,
          r.scan_result,
          r.attendee_name ?? '',
          r.scanner_name ?? '',
          r.ip_address ?? '',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sessionName}-scan-log.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search attendee or scanner…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {RESULT_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(0) }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {f === 'all' ? 'All' : (resultLabel[f as keyof typeof resultLabel] ?? f)}
            </button>
          ))}
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors ml-auto"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Result</th>
              <th className="px-4 py-3 text-left">Attendee</th>
              <th className="px-4 py-3 text-left">Scanner</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No results
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                      {formatDate(row.scanned_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {resultIcon[row.scan_result as keyof typeof resultIcon] ?? null}
                      <span className="text-gray-700">
                        {resultLabel[row.scan_result as keyof typeof resultLabel] ?? row.scan_result}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{row.attendee_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{row.scanner_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs hidden sm:table-cell">
                    {row.ip_address ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{' '}
            {filtered.length}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
