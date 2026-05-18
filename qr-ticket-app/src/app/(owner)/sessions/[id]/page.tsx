'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Users, TicketCheck, Ticket, CalendarDays, Pencil } from 'lucide-react'
import Link from 'next/link'
import { SessionStats } from '@/components/sessions/SessionStats'
import { SessionForm } from '@/components/sessions/SessionForm'
import { ConfirmModal } from '@/components/sessions/ConfirmModal'
import { formatDate, cn } from '@/lib/utils'
import type { Session, Ticket as TicketType } from '@/types'

interface SessionDetailData extends Session {
  tickets: TicketType[]
}

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [session, setSession] = useState<SessionDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showDeactivate, setShowDeactivate] = useState(false)

  async function load() {
    try {
      const res = await fetch(`/api/sessions/${id}`)
      const data = (await res.json()) as { session?: SessionDetailData; error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Failed to load'); return }
      setSession(data.session ?? null)
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [id])

  async function handleDeactivate() {
    const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Session deactivated')
      router.push('/sessions')
    } else {
      const d = (await res.json()) as { error?: string }
      toast.error(d.error ?? 'Failed to deactivate')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center pt-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="pt-16 text-center text-gray-500">
        Session not found.{' '}
        <Link href="/sessions" className="underline">Go back</Link>
      </div>
    )
  }

  const usedTickets = session.tickets.filter((t) => t.is_used).length
  const totalTickets = session.tickets.length

  return (
    <>
      {/* Back link */}
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All sessions
      </Link>

      {/* Header */}
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{session.name}</h1>
            <span className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              session.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            )}>
              {session.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          {session.description && (
            <p className="mt-1 text-sm text-gray-500">{session.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
            {session.starts_at && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(session.starts_at)}
                {session.ends_at && ` → ${formatDate(session.ends_at)}`}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          {session.is_active && (
            <button
              onClick={() => setShowDeactivate(true)}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Deactivate
            </button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            Capacity
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">{session.capacity}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Ticket className="h-4 w-4" />
            Generated
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">{totalTickets}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TicketCheck className="h-4 w-4" />
            Checked in
          </div>
          <p className="mt-1 text-2xl font-bold text-green-600">{usedTickets}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
        <SessionStats capacity={session.capacity} total={totalTickets} used={usedTickets} />
      </div>

      {/* Tickets table */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Tickets</h2>
          <span className="text-sm text-gray-400">{totalTickets} total</span>
        </div>

        {totalTickets === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No tickets generated yet. Phase 7 adds ticket generation.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="px-5 py-3 text-left font-medium">Attendee</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Used at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {session.tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-700">
                      {ticket.attendee_name ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        ticket.is_used
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      )}>
                        {ticket.is_used ? 'Used' : 'Unused'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400">
                      {ticket.used_at ? formatDate(ticket.used_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEdit && (
        <SessionForm
          session={session}
          onClose={() => { setShowEdit(false); void load() }}
        />
      )}

      {showDeactivate && (
        <ConfirmModal
          title="Deactivate session?"
          description="Scanners will no longer be able to validate tickets for this session. This cannot be undone."
          confirmLabel="Deactivate"
          onConfirm={handleDeactivate}
          onClose={() => setShowDeactivate(false)}
        />
      )}
    </>
  )
}
