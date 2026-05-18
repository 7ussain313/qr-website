import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  color?: 'blue' | 'green' | 'yellow' | 'purple'
  loading?: boolean
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  purple: 'bg-purple-50 text-purple-600',
}

export function StatsCard({ label, value, icon: Icon, color = 'blue', loading }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', colorMap[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3">
        {loading ? (
          <div className="h-8 w-20 animate-pulse rounded bg-gray-100" />
        ) : (
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        )}
      </div>
    </div>
  )
}
