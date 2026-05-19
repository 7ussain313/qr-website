'use client'

import { useEffect, useState } from 'react'
import { X, Copy, Check, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface Session {
  id: string
  name: string
  capacity: number
}

interface CreatedScanner {
  email: string
  password: string
  assigned_session: { id: string; name: string }
}

interface Props {
  onClose: () => void
  onCreated: () => void
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : label}
    </button>
  )
}

export function CreateScannerForm({ onClose, onCreated }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState<CreatedScanner | null>(null)

  useEffect(() => {
    fetch('/api/sessions/active')
      .then((r) => r.json())
      .then((d: { sessions: Session[] }) => {
        const list = d.sessions ?? []
        setSessions(list)
        if (list.length === 1 && list[0]) setSessionId(list[0].id)
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/staff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: fullName, session_id: sessionId }),
      })
      const data = (await res.json()) as { email: string; password: string; assigned_session: { id: string; name: string }; error?: string }
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create scanner')
      } else {
        setCreated({ email: data.email, password: data.password, assigned_session: data.assigned_session })
        onCreated()
      }
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function copyAll() {
    if (!created) return
    await navigator.clipboard.writeText(
      `Email: ${created.email}\nPassword: ${created.password}\nSession: ${created.assigned_session.name}`
    )
    toast.success('Login info copied')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">
            {created ? 'Scanner Created' : 'Add Scanner'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {created ? (
          /* Credentials card */
          <div className="p-6 space-y-4">
            {/* Warning */}
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800 font-medium">
                This password is shown once. Save it now.
              </p>
            </div>

            {/* Session */}
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500 uppercase tracking-wide">Session</p>
              <p className="text-sm font-semibold text-gray-900">{created.assigned_session.name}</p>
            </div>

            {/* Email */}
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5">
                <span className="text-sm font-medium text-gray-900 break-all">{created.email}</span>
                <CopyButton value={created.email} label="Copy" />
              </div>
            </div>

            {/* Password */}
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500 uppercase tracking-wide">Password</p>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5">
                <span className="font-mono text-base font-bold tracking-widest text-gray-900">
                  {created.password}
                </span>
                <CopyButton value={created.password} label="Copy" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={copyAll}
                className="flex-1 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                Copy login info
              </button>
              <button
                onClick={() => {
                  setCreated(null)
                  setEmail('')
                  setFullName('')
                  setSessionId(sessions.length === 1 && sessions[0] ? sessions[0].id : '')
                }}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Add another
              </button>
            </div>
          </div>
        ) : (
          /* Create form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Full name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Johnson"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="scanner@example.com"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Assign to session</label>
              {sessions.length === 0 ? (
                <p className="text-sm text-gray-400">No active sessions — create one first.</p>
              ) : (
                <select
                  required
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                >
                  <option value="">Select a session…</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading || sessions.length === 0}
                className="flex-1 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Creating…' : 'Create scanner'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
