'use client'

import { useEffect, useState } from 'react'
import { Users, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { InviteForm } from '@/components/staff/InviteForm'
import { RevokeButton } from '@/components/staff/RevokeButton'
import { formatDate, cn } from '@/lib/utils'

interface StaffMember {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  created_at: string
  last_scan_at: string | null
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/staff')
      const data = (await res.json()) as { staff?: StaffMember[]; error?: string }
      if (!res.ok) toast.error(data.error ?? 'Failed to load staff')
      else setStaff(data.staff ?? [])
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
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="mt-1 text-sm text-gray-500">{staff.length} scanner account{staff.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Invite Staff
        </button>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
          </div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
              <Users className="h-7 w-7 text-gray-400" />
            </div>
            <p className="font-medium text-gray-700">No staff yet</p>
            <p className="text-sm text-gray-400">Invite your first scanner to get started.</p>
            <button
              onClick={() => setShowInvite(true)}
              className="mt-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              Invite staff
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="px-5 py-3 text-left font-medium">Name / Email</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Joined</th>
                  <th className="px-5 py-3 text-left font-medium">Last scan</th>
                  <th className="px-5 py-3 text-left font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{member.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{member.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        member.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-500'
                      )}>
                        {member.is_active ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400">
                      {formatDate(member.created_at)}
                    </td>
                    <td className="px-5 py-3 text-gray-400">
                      {member.last_scan_at ? formatDate(member.last_scan_at) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {member.is_active && (
                        <RevokeButton
                          staffId={member.id}
                          staffName={member.full_name ?? member.email}
                          onRevoked={load}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInvite && (
        <InviteForm
          onClose={() => setShowInvite(false)}
          onInvited={load}
        />
      )}
    </>
  )
}
