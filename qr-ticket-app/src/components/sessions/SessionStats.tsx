interface SessionStatsProps {
  capacity: number
  total: number
  used: number
}

export function SessionStats({ capacity, total, used }: SessionStatsProps) {
  const usedPct = capacity > 0 ? Math.round((used / capacity) * 100) : 0
  const generatedPct = capacity > 0 ? Math.round((total / capacity) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{used} checked in</span>
        <span>{total} / {capacity} tickets</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        {/* Generated tickets (gray) */}
        <div
          className="relative h-full rounded-full bg-gray-300 transition-all"
          style={{ width: `${generatedPct}%` }}
        >
          {/* Used tickets (green) */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-green-500 transition-all"
            style={{ width: `${total > 0 ? Math.round((used / total) * 100) : 0}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-gray-400">{usedPct}% capacity used</p>
    </div>
  )
}
