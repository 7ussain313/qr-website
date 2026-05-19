'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import jsQR from 'jsqr'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  WifiOff,
  Camera,
  QrCode,
  LogOut,
  Users,
  X,
  Search,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { RealtimeCounter } from '@/components/analytics/RealtimeCounter'

type ScanStatus = 'idle' | 'processing' | 'success' | 'used' | 'expired' | 'invalid'

interface ScanResult {
  attendeeName?: string | null
  sessionName?: string | null
  usedAt?: string | null
  message?: string
}

type ValidateResponse = {
  valid?: boolean
  reason?: string
  attendee_name?: string | null
  session_name?: string | null
  used_at?: string | null
  error?: string
}

interface Ticket {
  id: string
  attendee_name: string | null
  attendee_email: string | null
  is_used: boolean
  used_at: string | null
}

interface TicketData {
  tickets: Ticket[]
  total: number
  checked_in: number
  remaining: number
}

interface SessionOption {
  id: string
  name: string
  capacity: number
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanningRef = useRef(true)

  const [status, setStatus] = useState<ScanStatus>('idle')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [scannedToday, setScannedToday] = useState<number | null>(null)

  // Attendee panel state
  const [showPanel, setShowPanel] = useState(false)
  const [sessions, setSessions] = useState<SessionOption[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d: { scanned_today: number }) => setScannedToday(d.scanned_today))
      .catch(() => { /* non-critical */ })
  }, [])

  // Online / offline detection
  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // Load active sessions when panel opens
  useEffect(() => {
    if (!showPanel) return
    fetch('/api/sessions/active')
      .then((r) => r.json())
      .then((d: { sessions: SessionOption[] }) => {
        const list = d.sessions ?? []
        setSessions(list)
        if (list.length === 1 && list[0]) setSelectedSessionId(list[0].id)
      })
      .catch(() => {})
  }, [showPanel])

  // Poll tickets when session selected + panel open
  useEffect(() => {
    if (!showPanel || !selectedSessionId) {
      setTicketData(null)
      return
    }

    let cancelled = false

    async function fetchTickets() {
      if (!selectedSessionId) return
      setLoadingTickets(true)
      try {
        const r = await fetch(`/api/sessions/${selectedSessionId}/tickets`)
        const d = (await r.json()) as TicketData
        if (!cancelled) setTicketData(d)
      } catch {
        // non-critical
      } finally {
        if (!cancelled) setLoadingTickets(false)
      }
    }

    void fetchTickets()
    const interval = setInterval(fetchTickets, 3000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [showPanel, selectedSessionId])

  const handleScan = useCallback(async (rawData: string) => {
    scanningRef.current = false
    setStatus('processing')
    vibrate(50)

    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: rawData }),
      })

      if (res.status === 409) {
        setStatus('invalid')
        setResult({ message: 'Scan collision — try again' })
        vibrate(300)
      } else if (res.status === 429) {
        setStatus('invalid')
        setResult({ message: 'Rate limit exceeded — wait 60s' })
        vibrate(300)
      } else {
        const data = (await res.json()) as ValidateResponse

        if (data.valid) {
          setStatus('success')
          setResult({
            attendeeName: data.attendee_name,
            sessionName: data.session_name,
          })
          vibrate([100, 50, 100])
        } else {
          const reason = data.reason ?? 'not_found'
          if (reason === 'already_used') {
            setStatus('used')
            setResult({ usedAt: data.used_at })
          } else if (reason === 'expired') {
            setStatus('expired')
          } else {
            setStatus('invalid')
          }
          vibrate([200, 100, 200])
        }
      }
    } catch {
      setStatus('invalid')
      setResult({ message: 'Network error — check connection' })
      vibrate(500)
    }

    // Auto-reset after 3 seconds
    setTimeout(() => {
      setStatus('idle')
      setResult(null)
      scanningRef.current = true
    }, 3000)
  }, [])

  // Camera initialisation + scan loop
  useEffect(() => {
    let stream: MediaStream | null = null
    let rafId: number | null = null
    let active = true

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        })

        if (!active || !videoRef.current) return
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        rafId = requestAnimationFrame(tick)
      } catch {
        if (active) {
          setCameraError('Camera access denied. Enable camera permission and reload the page.')
        }
      }
    }

    function tick() {
      if (!active) return

      const video = videoRef.current
      const canvas = canvasRef.current

      if (scanningRef.current && video && canvas && video.readyState === 4) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          })
          if (code?.data) {
            void handleScan(code.data)
          }
        }
      }

      rafId = requestAnimationFrame(tick)
    }

    void startCamera()

    return () => {
      active = false
      stream?.getTracks().forEach((t) => t.stop())
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [handleScan])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const filteredTickets = (ticketData?.tickets ?? []).filter((t) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.attendee_name?.toLowerCase().includes(q) ||
      t.attendee_email?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* Camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
      />

      {/* Hidden canvas for frame analysis */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Dark vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70 pointer-events-none" />

      {/* Offline banner */}
      {!isOnline && (
        <div className="absolute top-0 inset-x-0 flex items-center justify-center gap-2 bg-yellow-500 px-4 py-2 text-sm font-semibold text-black z-20">
          <WifiOff className="h-4 w-4" />
          No internet — scanning disabled until connection is restored
        </div>
      )}

      {/* Header */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 z-10">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
            <QrCode className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-white drop-shadow">QR Ticket Scanner</span>
        </div>
        <div className="flex items-center gap-2">
          {scannedToday !== null && (
            <div className="[&>div]:bg-white/10 [&>div]:text-white [&_svg]:text-white/70">
              <RealtimeCounter initialCount={scannedToday} />
            </div>
          )}
          <button
            onClick={() => setShowPanel(true)}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
          >
            <Users className="h-4 w-4" />
            List
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>

      {/* Camera error state */}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center z-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <Camera className="h-8 w-8 text-white/60" />
          </div>
          <p className="max-w-xs text-sm text-white/80">{cameraError}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-colors"
          >
            Reload
          </button>
        </div>
      )}

      {/* Scanning reticle */}
      {!cameraError && (status === 'idle' || status === 'processing') && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative h-60 w-60 sm:h-72 sm:w-72">
            <div className="absolute top-0 left-0 h-10 w-10 border-l-[3px] border-t-[3px] border-white rounded-tl-sm" />
            <div className="absolute top-0 right-0 h-10 w-10 border-r-[3px] border-t-[3px] border-white rounded-tr-sm" />
            <div className="absolute bottom-0 left-0 h-10 w-10 border-l-[3px] border-b-[3px] border-white rounded-bl-sm" />
            <div className="absolute bottom-0 right-0 h-10 w-10 border-r-[3px] border-b-[3px] border-white rounded-br-sm" />
            {status === 'processing' && (
              <div className="absolute inset-x-0 top-0 h-0.5 bg-white/80 animate-[scanline_1s_ease-in-out_infinite]" />
            )}
          </div>
        </div>
      )}

      {/* Status card */}
      {!cameraError && (
        <div className="absolute bottom-0 inset-x-0 p-4 pb-safe z-10">
          <StatusCard status={status} result={result} />
        </div>
      )}

      {/* Attendee list panel */}
      {showPanel && (
        <>
          {/* Backdrop */}
          <div
            className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPanel(false)}
          />

          {/* Sheet */}
          <div className="absolute bottom-0 inset-x-0 z-30 flex flex-col rounded-t-2xl bg-white shadow-2xl"
            style={{ maxHeight: '75vh' }}>

            {/* Sheet header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-700" />
                <h2 className="font-semibold text-gray-900">Attendee List</h2>
                {loadingTickets && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Session selector */}
            <div className="px-5 py-3 border-b border-gray-100 shrink-0">
              {sessions.length === 0 ? (
                <p className="text-sm text-gray-400">No active sessions found</p>
              ) : (
                <select
                  value={selectedSessionId}
                  onChange={(e) => {
                    setSelectedSessionId(e.target.value)
                    setSearch('')
                  }}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                >
                  <option value="">Select a session…</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>

            {selectedSessionId && ticketData && (
              <>
                {/* Stats bar */}
                <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 shrink-0">
                  <div className="px-4 py-3 text-center">
                    <p className="text-xl font-bold text-gray-900">{ticketData.total}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                  <div className="px-4 py-3 text-center">
                    <p className="text-xl font-bold text-green-600">{ticketData.checked_in}</p>
                    <p className="text-xs text-gray-500">Checked in</p>
                  </div>
                  <div className="px-4 py-3 text-center">
                    <p className="text-xl font-bold text-gray-400">{ticketData.remaining}</p>
                    <p className="text-xs text-gray-500">Remaining</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-gray-100 shrink-0">
                  <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: ticketData.total ? `${(ticketData.checked_in / ticketData.total) * 100}%` : '0%' }}
                  />
                </div>

                {/* Search */}
                <div className="px-4 py-2.5 border-b border-gray-100 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or email…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </div>
                </div>

                {/* Ticket list */}
                <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
                  {filteredTickets.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-gray-400">
                      {search ? 'No matches found' : 'No tickets yet'}
                    </div>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className={cn(
                          'flex items-center gap-3 px-5 py-3',
                          ticket.is_used ? 'bg-green-50' : 'bg-white'
                        )}
                      >
                        <div className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                          ticket.is_used ? 'bg-green-100' : 'bg-gray-100'
                        )}>
                          {ticket.is_used
                            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                            : <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'truncate text-sm font-medium',
                            ticket.is_used ? 'text-green-900' : 'text-gray-700'
                          )}>
                            {ticket.attendee_name ?? 'Unknown attendee'}
                          </p>
                          {ticket.attendee_email && (
                            <p className="truncate text-xs text-gray-400">{ticket.attendee_email}</p>
                          )}
                        </div>
                        {ticket.is_used && ticket.used_at && (
                          <div className="flex items-center gap-1 shrink-0 text-xs text-green-600">
                            <Clock className="h-3 w-3" />
                            {formatDate(ticket.used_at)}
                          </div>
                        )}
                        {!ticket.is_used && (
                          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                            Waiting
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {selectedSessionId && !ticketData && loadingTickets && (
              <div className="flex flex-1 items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function StatusCard({ status, result }: { status: ScanStatus; result: ScanResult | null }) {
  if (status === 'idle') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-4 backdrop-blur-md">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
          <QrCode className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-white">Ready to scan</p>
          <p className="text-sm text-white/60">Point camera at a QR code</p>
        </div>
      </div>
    )
  }

  if (status === 'processing') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-4 backdrop-blur-md">
        <Loader2 className="h-6 w-6 shrink-0 animate-spin text-white" />
        <p className="font-semibold text-white">Validating…</p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl bg-green-500 px-5 py-4 shadow-lg">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-white" />
          <div>
            <p className="font-bold text-white text-lg leading-tight">VALID</p>
            {result?.attendeeName && (
              <p className="mt-0.5 font-semibold text-white">{result.attendeeName}</p>
            )}
            {result?.sessionName && (
              <p className="text-sm text-green-100">{result.sessionName}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (status === 'used') {
    return (
      <div className="rounded-2xl bg-red-500 px-5 py-4 shadow-lg">
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-white" />
          <div>
            <p className="font-bold text-white text-lg leading-tight">ALREADY USED</p>
            {result?.usedAt && (
              <p className="text-sm text-red-100">Scanned at {formatDate(result.usedAt)}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="rounded-2xl bg-yellow-500 px-5 py-4 shadow-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-white" />
          <div>
            <p className="font-bold text-white text-lg leading-tight">TICKET EXPIRED</p>
            <p className="text-sm text-yellow-100">This ticket is no longer valid</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-red-600 px-5 py-4 shadow-lg">
      <div className="flex items-start gap-3">
        <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-white" />
        <div>
          <p className="font-bold text-white text-lg leading-tight">NOT RECOGNISED</p>
          <p className="text-sm text-red-100">
            {result?.message ?? 'QR code not found in the system'}
          </p>
        </div>
      </div>
    </div>
  )
}
