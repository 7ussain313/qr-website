'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Session } from '@/types'

interface SessionFormProps {
  session?: Session
  onClose: () => void
}

export function SessionForm({ session, onClose }: SessionFormProps) {
  const router = useRouter()
  const isEdit = !!session
  const [loading, setLoading] = useState(false)

  const [fields, setFields] = useState({
    name: session?.name ?? '',
    description: session?.description ?? '',
    capacity: session?.capacity?.toString() ?? '',
    starts_at: session?.starts_at ? session.starts_at.slice(0, 16) : '',
    ends_at: session?.ends_at ? session.ends_at.slice(0, 16) : '',
  })

  function set(key: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const capacity = parseInt(fields.capacity, 10)
    if (isNaN(capacity) || capacity < 1) {
      toast.error('Capacity must be a number greater than 0')
      setLoading(false)
      return
    }

    const body = {
      name: fields.name,
      description: fields.description || null,
      capacity,
      starts_at: fields.starts_at ? new Date(fields.starts_at).toISOString() : null,
      ends_at: fields.ends_at ? new Date(fields.ends_at).toISOString() : null,
    }

    try {
      const url = isEdit ? `/api/sessions/${session.id}` : '/api/sessions'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = (await res.json()) as { error?: string }

      if (!res.ok) {
        toast.error(data.error ?? 'Something went wrong')
        return
      }

      toast.success(isEdit ? 'Session updated' : 'Session created')
      onClose()
      router.refresh()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Session' : 'New Session'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Name *</label>
            <input
              type="text"
              required
              value={fields.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Conference Day 1"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={fields.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Optional description"
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Capacity *</label>
            <input
              type="number"
              required
              min={1}
              value={fields.capacity}
              onChange={(e) => set('capacity', e.target.value)}
              placeholder="e.g. 200"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Starts at</label>
              <input
                type="datetime-local"
                value={fields.starts_at}
                onChange={(e) => set('starts_at', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                disabled={loading}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Ends at</label>
              <input
                type="datetime-local"
                value={fields.ends_at}
                onChange={(e) => set('ends_at', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                disabled={loading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white',
                'hover:bg-gray-800 disabled:opacity-60 transition-colors'
              )}
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
