import Link from 'next/link'
import { CalendarDays, Users, ChevronRight } from 'lucide-react'
import { SessionStats } from './SessionStats'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface SessionCardProps {
  id: string
  name: string
  description: string | null
  capacity: number
  totalTickets: number
  usedTickets: number
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
}

export function SessionCard({
  id,
  name,
  description,
  capacity,
  totalTickets,
  usedTickets,
  isActive,
  startsAt,
  endsAt,
}: SessionCardProps) {
  return (
    <Link
      href={`/sessions/${id}`}
      className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:border-gray-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-gray-900">{name}</h3>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                isActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              )}
            >
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {description && (
            <p className="mt-1 line-clamp-1 text-sm text-gray-500">{description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {capacity} capacity
            </span>
            {startsAt && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(startsAt)}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
      </div>

      <div className="mt-4">
        <SessionStats capacity={capacity} total={totalTickets} used={usedTickets} />
      </div>
    </Link>
  )
}
