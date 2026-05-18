'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { X, Loader2, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InviteFormProps {
  onClose: () => void
  onInvited: () => void
}

export function InviteForm({ onClose, onInvited }: InviteFormProps) {
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [expiresIn, setExpiresIn] = useState(48)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/staff/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, expires_in_hours: expiresIn }),
      })

      const data = (await res.json()) as { invite_url?: string; error?: string }

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create invite')
        return
      }

      setInviteUrl(data.invite_url ?? null)
      onInvited()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Invite Staff</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!inviteUrl ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Email address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@example.com"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Link expires in</label>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-black focus:outline-none"
                disabled={loading}
              >
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours</option>
                <option value={168}>7 days</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
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
                Generate invite link
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4 px-6 py-5">
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
              Invite link created! Share this link with the staff member.
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
              <p className="flex-1 truncate text-xs text-gray-600">{inviteUrl}</p>
              <button
                onClick={copyLink}
                className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-200 transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <p className="text-xs text-gray-400">
              This link expires in {expiresIn} hours. The staff member will set their own password when they accept.
            </p>

            <button
              onClick={onClose}
              className="w-full rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
