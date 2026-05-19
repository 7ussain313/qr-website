'use client'

import { useEffect, useState } from 'react'
import { Users, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { CreateScannerForm } from '@/components/staff/CreateScannerForm'
import { RevokeButton } from '@/components/staff/RevokeButton'
import { formatDate, cn } from '@/lib/utils'

interface StaffMember {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  created_at: string
  last_scan_at: string | null
  assigned_session_id: string | null
  sessions: { id: string; name: string } | null
}

interface AssignModalState {
  staffId: string
  staffName: string
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [sessions, setSessions] = useState<{ id: string; name: string }[]>([])
  const [assignModal, setAssignModal] = useState<AssignModalState | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [newSessionId, setNewSessionId] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [staffRes, sessRes] = await Promise.all([
        fetch('/api/staff'),
        fetch('/api/sessions/active'),
      ])
      const staffData = (await staffRes.json()) as { staff?: StaffMember[]; error?: string }
      const sessData = (await sessRes.json()) as { sessions?: { id: string; name: string }[] }
      if (!staffRes.ok) toast.error(staffData.error ?? 'Failed to load staff')
      else setStaff(staffData.staff ?? [])
      setSessions(sessData.sessions ?? [])
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function handleAssign() {
    if (!assignModal || !newSessionId) return
    setAssigning(true)
    try {
      const res = await fetch(`/api/staff/${assignModal.staffId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: newSessionId }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) toast.error(data.error ?? 'Failed to reassign')
      else {
        toast.success('Session updated')
        setAssignModal(null)
        void load()
      }
    } catch {
      toast.error('Network error')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="mt-1 text-sm text-gray-500">{staff.length} scanner account{staff.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Add Scanner
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
            <p className="text-sm text-gray-400">Add your first scanner to get started.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              Add scanner
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="px-5 py-3 text-left font-medium">Name / Email</th>
                  <th className="px-5 py-3 text-left font-medium">Session</th>
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
                      {member.sessions ? (
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {member.sessions.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Unassigned</span>
                      )}
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
                      <div className="flex items-center gap-2">
                        {member.is_active && (
                          <>
                            <button
                              onClick={() => {
                                setAssignModal({ staffId: member.id, staffName: member.full_name ?? member.email })
                                setNewSessionId(member.assigned_session_id ?? '')
                              }}
                              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              Reassign
                            </button>
                            <RevokeButton
                              staffId={member.id}
                              staffName={member.full_name ?? member.email}
                              onRevoked={load}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateScannerForm
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}

      {/* Reassign modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-1 font-semibold text-gray-900">Reassign session</h3>
            <p className="mb-4 text-sm text-gray-500">{assignModal.staffName}</p>
            <select
              value={newSessionId}
              onChange={(e) => setNewSessionId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
            >
              <option value="">Select a session…</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleAssign}
                disabled={assigning || !newSessionId}
                className="flex-1 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {assigning ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setAssignModal(null)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
