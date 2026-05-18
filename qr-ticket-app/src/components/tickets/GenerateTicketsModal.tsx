'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Upload, X } from 'lucide-react'
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

export function GenerateTicketsModal({ sessionId, remaining, onClose, onGenerated }: Props) {
  const [count, setCount] = useState(Math.max(1, Math.min(1, remaining)))
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [csvFileName, setCsvFileName] = useState('')
  const [loading, setLoading] = useState(false)

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? ''
      const lines = text.split(/\r?\n/).filter((l) => l.trim())
      const parsed: Attendee[] = lines.map((line) => {
        const [rawName = '', rawEmail = ''] = line.split(',').map((s) => s.trim())
        return { name: rawName, email: rawEmail }
      })
      const valid = parsed.filter((a) => a.name)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (remaining === 0) return
    setLoading(true)

    try {
      const body = {
        count,
        ...(attendees.length > 0 && { attendees }),
      }

      const res = await fetch(`/api/sessions/${sessionId}/tickets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = (await res.json()) as { error?: string }

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to generate tickets')
        return
      }

      toast.success(`${count} ticket${count !== 1 ? 's' : ''} generated`)
      onGenerated()
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Generate Tickets</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {remaining === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            This session is at full capacity.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Number of tickets
                <span className="ml-1 font-normal text-gray-400">
                  ({remaining} remaining)
                </span>
              </label>
              <input
                type="number"
                required
                min={1}
                max={remaining}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                disabled={attendees.length > 0 || loading}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 disabled:bg-gray-50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Attendee list{' '}
                <span className="font-normal text-gray-400">(optional — CSV: name, email)</span>
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
                disabled={loading}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5',
                  'text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 transition-colors'
                )}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate {count} ticket{count !== 1 ? 's' : ''}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
