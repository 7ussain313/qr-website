'use client'

import { useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmModalProps {
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => Promise<void>
  onClose: () => void
}

export function ConfirmModal({
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              'flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white',
              'hover:bg-red-700 disabled:opacity-60 transition-colors'
            )}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
