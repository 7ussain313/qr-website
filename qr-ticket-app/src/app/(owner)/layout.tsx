import Link from 'next/link'
import { LayoutDashboard, CalendarDays, Users, BarChart2, QrCode } from 'lucide-react'
import { LogoutButton } from '@/components/auth/LogoutButton'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sessions', label: 'Sessions', icon: CalendarDays },
  { href: '/staff', label: 'Staff', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
]

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black">
              <QrCode className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">QR Ticket App</span>
          </div>

          {/* Nav links */}
          <nav className="hidden items-center gap-1 sm:flex">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <LogoutButton />
        </div>

        {/* Mobile nav */}
        <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
