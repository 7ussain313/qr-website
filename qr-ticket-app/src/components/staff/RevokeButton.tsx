'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { ConfirmModal } from '@/components/sessions/ConfirmModal'

interface RevokeButtonProps {
  staffId: string
  staffName: string
  onRevoked: () => void
}

export function RevokeButton({ staffId, staffName, onRevoked }: RevokeButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleRevoke() {
    setLoading(true)
    try {
      const res = await fetch(`/api/staff/${staffId}/revoke`, { method: 'POST' })
      const data = (await res.json()) as { error?: string }

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to revoke access')
        return
      }

      toast.success(`Access revoked for ${staffName}`)
      setShowConfirm(false)
      onRevoked()
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Revoke
      </button>

      {showConfirm && (
        <ConfirmModal
          title="Revoke access?"
          description={`${staffName} will be immediately signed out and can no longer scan tickets.`}
          confirmLabel="Revoke access"
          onConfirm={handleRevoke}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
