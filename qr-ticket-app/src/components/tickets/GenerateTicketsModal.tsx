'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Upload, X, List } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Attendee {
  name: string
  email: string
}

interface Props {
  sessionId: string
  remaining: number
  onClose: () => void
  onGenerated: () => void
}

type InputMode = 'count' | 'csv' | 'text'

function parseNameLines(text: string): Attendee[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [rawName = '', rawEmail = ''] = line.split(',').map((s) => s.trim())
      return { name: rawName, email: rawEmail }
    })
    .filter((a) => a.name.length > 0)
}

export function GenerateTicketsModal({ sessionId, remaining, onClose, onGenerated }: Props) {
  const [mode, setMode] = useState<InputMode>('count')
  const [count, setCount] = useState(Math.max(1, Math.min(1, remaining)))
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [csvFileName, setCsvFileName] = useState('')
  const [nameText, setNameText] = useState('')
  const [loading, setLoading] = useState(false)

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? ''
      const valid = parseNameLines(text)
      setCsvFileName(file.name)
      setAttendees(valid)
      setCount(valid.length)
    }
    reader.readAsText(file)
  }

  function clearCsv() {
    setCsvFileName('')
    setAttendees([])
    setCount(1)
  }

  // Derive attendees from text input on submit
  function getSubmitPayload(): { count: number; attendees?: Attendee[] } {
    if (mode === 'text') {
      const parsed = parseNameLines(nameText)
      if (parsed.length === 0) return { count }
      return { count: parsed.length, attendees: parsed }
    }
    if (mode === 'csv' && attendees.length > 0) {
      return { count: attendees.length, attendees }
    }
    return { count }
  }

  function getEffectiveCount(): number {
    if (mode === 'text') {
      const parsed = parseNameLines(nameText)
      return parsed.length > 0 ? parsed.length : count
    }
    if (mode === 'csv') return attendees.length > 0 ? attendees.length : count
    return count
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (remaining === 0) return

    const payload = getSubmitPayload()
    if (payload.count === 0) {
      toast.error('Enter at least one name or set a ticket count')
      return
    }
    if (payload.count > remaining) {
      toast.error(`Only ${remaining} tickets remaining in this session`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/tickets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to generate tickets')
        return
      }
      toast.success(`${payload.count} ticket${payload.count !== 1 ? 's' : ''} generated`)
      onGenerated()
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  const effectiveCount = getEffectiveCount()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Generate Tickets</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {remaining === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            This session is at full capacity.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
            {/* Mode tabs */}
            <div className="flex rounded-lg border border-gray-200 p-1 gap-1">
              {([
                { id: 'count', label: 'Count only' },
                { id: 'text', label: 'Enter names' },
                { id: 'csv', label: 'Upload CSV' },
              ] as { id: InputMode; label: string }[]).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={cn(
                    'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors',
                    mode === id
                      ? 'bg-black text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Count-only mode */}
            {mode === 'count' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Number of tickets
                  <span className="ml-1 font-normal text-gray-400">({remaining} remaining)</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={remaining}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 disabled:bg-gray-50"
                />
              </div>
            )}

            {/* Text input mode */}
            {mode === 'text' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Names list
                  <span className="ml-1 font-normal text-gray-400">
                    — one per line, optionally: name, email
                  </span>
                </label>
                <textarea
                  rows={8}
                  placeholder={"John Smith\nJane Doe, jane@example.com\nBob Johnson"}
                  value={nameText}
                  onChange={(e) => setNameText(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm font-mono focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 disabled:bg-gray-50 resize-none"
                />
                {nameText.trim() && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <List className="h-3 w-3" />
                    {parseNameLines(nameText).length} attendee{parseNameLines(nameText).length !== 1 ? 's' : ''} detected
                  </p>
                )}
              </div>
            )}

            {/* CSV upload mode */}
            {mode === 'csv' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  CSV file
                  <span className="ml-1 font-normal text-gray-400">— columns: name, email (optional)</span>
                </label>
                {csvFileName ? (
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-sm">
                    <span className="text-gray-700">
                      {csvFileName}{' '}
                      <span className="text-gray-400">— {attendees.length} attendees</span>
                    </span>
                    <button
                      type="button"
                      onClick={clearCsv}
                      disabled={loading}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300',
                      'px-3.5 py-2.5 text-sm text-gray-500 hover:border-gray-400 transition-colors'
                    )}
                  >
                    <Upload className="h-4 w-4" />
                    Upload CSV file
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="sr-only"
                      onChange={handleCsvUpload}
                      disabled={loading}
                    />
                  </label>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || effectiveCount === 0}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5',
                  'text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 transition-colors'
                )}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate {effectiveCount > 0 ? effectiveCount : ''} ticket{effectiveCount !== 1 ? 's' : ''}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
