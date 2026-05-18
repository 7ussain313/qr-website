'use client'

import { useEffect, useState } from 'react'
import { Plus, CalendarDays } from 'lucide-react'
import { SessionCard } from '@/components/sessions/SessionCard'
import { SessionForm } from '@/components/sessions/SessionForm'
import { toast } from 'sonner'

interface TicketCount {
  count: number
}

interface SessionRow {
  id: string
  name: string
  description: string | null
  capacity: number
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  tickets: TicketCount[]
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/sessions')
      const data = (await res.json()) as { sessions?: SessionRow[]; error?: string }
      if (!res.ok) toast.error(data.error ?? 'Failed to load sessions')
      else setSessions(data.sessions ?? [])
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
          <p className="mt-1 text-sm text-gray-500">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Session
        </button>
      </div>

      {loading ? (
        <div className="mt-12 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <CalendarDays className="h-7 w-7 text-gray-400" />
          </div>
          <p className="font-medium text-gray-700">No sessions yet</p>
          <p className="text-sm text-gray-400">Create your first session to get started.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            Create session
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => (
            <SessionCard
              key={s.id}
              id={s.id}
              name={s.name}
              description={s.description}
              capacity={s.capacity}
              totalTickets={s.tickets[0]?.count ?? 0}
              usedTickets={0}
              isActive={s.is_active}
              startsAt={s.starts_at}
              endsAt={s.ends_at}
            />
          ))}
        </div>
      )}

      {showForm && (
        <SessionForm onClose={() => { setShowForm(false); void load() }} />
      )}
    </>
  )
}
