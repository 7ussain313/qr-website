'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QrCode, List, LogOut, Loader2 } from 'lucide-react'

interface AssignedSession {
  id: string
  name: string
}

export default function ScannerDashboardPage() {
  const router = useRouter()
  const [session, setSession] = useState<AssignedSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d: { assigned_session?: AssignedSession }) => {
        if (d.assigned_session) setSession(d.assigned_session)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch {
      setLoggingOut(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-6 py-10">
      {/* Logo + session info */}
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
          <QrCode className="h-8 w-8 text-black" />
        </div>
        <h1 className="text-2xl font-bold text-white">Scanner</h1>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        ) : session ? (
          <p className="rounded-full bg-white/10 px-3 py-1 text-sm text-gray-300">
            📍 {session.name}
          </p>
        ) : (
          <p className="rounded-full bg-yellow-500/20 px-3 py-1 text-sm text-yellow-400">
            No session assigned
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex w-full max-w-xs flex-col gap-4">
        <button
          onClick={() => router.push('/scan')}
          className="flex items-center gap-4 rounded-2xl bg-white px-6 py-5 text-left shadow-lg active:scale-95 hover:bg-gray-50 transition-all"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black">
            <QrCode className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Scan QR</p>
            <p className="text-sm text-gray-500">Open camera to scan tickets</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/scan-list')}
          className="flex items-center gap-4 rounded-2xl bg-white px-6 py-5 text-left shadow-lg active:scale-95 hover:bg-gray-50 transition-all"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-700">
            <List className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">View Scan List</p>
            <p className="text-sm text-gray-500">See attendee check-ins</p>
          </div>
        </button>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-4 rounded-2xl bg-gray-800 px-6 py-5 text-left shadow-lg active:scale-95 hover:bg-gray-700 disabled:opacity-60 transition-all"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-700">
            {loggingOut
              ? <Loader2 className="h-6 w-6 text-white animate-spin" />
              : <LogOut className="h-6 w-6 text-white" />
            }
          </div>
          <div>
            <p className="font-semibold text-white">Logout</p>
            <p className="text-sm text-gray-400">Sign out of your account</p>
          </div>
        </button>
      </div>
    </div>
  )
}
