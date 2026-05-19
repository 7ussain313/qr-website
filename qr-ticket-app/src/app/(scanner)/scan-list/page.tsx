'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Search,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

interface Ticket {
  id: string
  attendee_name: string | null
  attendee_email: string | null
  is_used: boolean
  used_at: string | null
}

interface TicketData {
  tickets: Ticket[]
  total: number
  checked_in: number
  remaining: number
}

export default function ScanListPage() {
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionName, setSessionName] = useState<string | null>(null)
  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d: { assigned_session_id?: string; assigned_session?: { id: string; name: string } }) => {
        if (d.assigned_session_id) setSessionId(d.assigned_session_id)
        if (d.assigned_session) setSessionName(d.assigned_session.name)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchTickets() {
      if (!sessionId) return
      try {
        const r = await fetch(`/api/sessions/${sessionId}/tickets`)
        const d = (await r.json()) as TicketData
        if (!cancelled) {
          setTicketData(d)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchTickets()
    const interval = setInterval(fetchTickets, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [sessionId])

  const filteredTickets = (ticketData?.tickets ?? []).filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.attendee_name?.toLowerCase().includes(q) ||
      t.attendee_email?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/scanner')}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Users className="h-5 w-5 text-gray-600" />
          <div>
            <h1 className="font-semibold text-gray-900">Scan List</h1>
            {sessionName && <p className="text-xs text-gray-400">{sessionName}</p>}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
        </div>
      ) : !sessionId ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-gray-400">No session assigned to your account.</p>
          <p className="text-xs text-gray-300">Contact your administrator.</p>
        </div>
      ) : ticketData ? (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-200 bg-white">
            <div className="px-4 py-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{ticketData.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-2xl font-bold text-green-600">{ticketData.checked_in}</p>
              <p className="text-xs text-gray-500">Checked in</p>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-2xl font-bold text-gray-400">{ticketData.remaining}</p>
              <p className="text-xs text-gray-500">Remaining</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-gray-200">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{
                width: ticketData.total
                  ? `${(ticketData.checked_in / ticketData.total) * 100}%`
                  : '0%',
              }}
            />
          </div>

          {/* Search */}
          <div className="border-b border-gray-200 bg-white px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          </div>

          {/* Ticket list */}
          <div className="flex-1 divide-y divide-gray-100 bg-white">
            {filteredTickets.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                {search ? 'No matches found' : 'No tickets yet'}
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={cn(
                    'flex items-center gap-3 px-5 py-3.5',
                    ticket.is_used ? 'bg-green-50' : 'bg-white'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                      ticket.is_used ? 'bg-green-100' : 'bg-gray-100'
                    )}
                  >
                    {ticket.is_used ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'truncate text-sm font-medium',
                        ticket.is_used ? 'text-green-900' : 'text-gray-700'
                      )}
                    >
                      {ticket.attendee_name ?? 'Unknown attendee'}
                    </p>
                    {ticket.attendee_email && (
                      <p className="truncate text-xs text-gray-400">{ticket.attendee_email}</p>
                    )}
                  </div>
                  {ticket.is_used && ticket.used_at ? (
                    <div className="flex items-center gap-1 shrink-0 text-xs text-green-600">
                      <Clock className="h-3 w-3" />
                      {formatDate(ticket.used_at)}
                    </div>
                  ) : (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                      Waiting
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
