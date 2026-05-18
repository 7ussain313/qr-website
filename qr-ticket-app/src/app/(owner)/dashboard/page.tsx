import Link from 'next/link'
import { CalendarDays, Users, BarChart2 } from 'lucide-react'

const quickLinks = [
  {
    href: '/sessions',
    icon: CalendarDays,
    label: 'Sessions',
    description: 'Create and manage event sessions',
  },
  {
    href: '/staff',
    icon: Users,
    label: 'Staff',
    description: 'Invite and manage scanner accounts',
  },
  {
    href: '/analytics',
    icon: BarChart2,
    label: 'Analytics',
    description: 'View attendance and scan history',
  },
]

export default function DashboardPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back. Manage your events below.</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {quickLinks.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 hover:border-gray-300 hover:shadow-md transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
              <Icon className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{label}</p>
              <p className="mt-0.5 text-sm text-gray-500">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
