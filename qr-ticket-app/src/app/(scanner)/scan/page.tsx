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

      {/* Scanning reticle — shown when idle or processing */}
      {!cameraError && (status === 'idle' || status === 'processing') && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative h-60 w-60 sm:h-72 sm:w-72">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 h-10 w-10 border-l-[3px] border-t-[3px] border-white rounded-tl-sm" />
            <div className="absolute top-0 right-0 h-10 w-10 border-r-[3px] border-t-[3px] border-white rounded-tr-sm" />
            <div className="absolute bottom-0 left-0 h-10 w-10 border-l-[3px] border-b-[3px] border-white rounded-bl-sm" />
            <div className="absolute bottom-0 right-0 h-10 w-10 border-r-[3px] border-b-[3px] border-white rounded-br-sm" />

            {/* Scanning line animation when processing */}
            {status === 'processing' && (
              <div className="absolute inset-x-0 top-0 h-0.5 bg-white/80 animate-[scanline_1s_ease-in-out_infinite]" />
            )}
          </div>
        </div>
      )}

      {/* Status card — pinned to bottom */}
      {!cameraError && (
        <div className="absolute bottom-0 inset-x-0 p-4 pb-safe z-10">
          <StatusCard status={status} result={result} />
        </div>
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

  // invalid
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
