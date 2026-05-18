'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zap } from 'lucide-react'

interface RealtimeCounterProps {
  initialCount: number
}

export function RealtimeCounter({ initialCount }: RealtimeCounterProps) {
  const [count, setCount] = useState(initialCount)
  const supabase = useRef(createClient()).current

  useEffect(() => {
    const channel = supabase
      .channel('scan-counter')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scan_logs',
          filter: 'scan_result=eq.success',
        },
        () => {
          setCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [supabase])

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
      <Zap className="h-3.5 w-3.5 text-green-500" />
      {count} scanned today
    </div>
  )
}
