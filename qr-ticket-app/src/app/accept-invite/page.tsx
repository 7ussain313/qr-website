'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { QrCode, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function AcceptInviteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')

  // Validate token on mount
  useEffect(() => {
    if (!token) { setValidating(false); return }

    fetch(`/api/staff/validate-invite?token=${token}`)
      .then((r) => r.json())
      .then((d: { valid?: boolean; email?: string }) => {
        setTokenValid(d.valid ?? false)
        setInviteEmail(d.email ?? '')
      })
      .catch(() => setTokenValid(false))
      .finally(() => setValidating(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/staff/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, full_name: fullName, password }),
      })

      const data = (await res.json()) as { error?: string }

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create account')
        return
      }

      toast.success('Account created! Please sign in.')
      router.push('/login')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="flex justify-center pt-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
      </div>
    )
  }

  if (!token || !tokenValid) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-semibold text-red-700">Invalid or expired invite link</p>
        <p className="mt-1 text-sm text-red-500">Ask your administrator for a new invitation.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <p className="mb-5 text-sm text-gray-500">
        Setting up account for <span className="font-medium text-gray-800">{inviteEmail}</span>
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Full name *</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Password *</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5',
            'text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 transition-colors'
          )}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Create account
        </button>
      </form>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black">
            <QrCode className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Accept Invitation</h1>
          <p className="text-sm text-gray-500">Create your scanner account</p>
        </div>

        <Suspense fallback={
          <div className="flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
          </div>
        }>
          <AcceptInviteForm />
        </Suspense>
      </div>
    </main>
  )
}
