import { createServerClient } from '@supabase/ssr'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'
import type { Profile } from '@/types'
import type { NextRequest } from 'next/server'

function parseCookieHeader(header: string): { name: string; value: string }[] {
  if (!header) return []
  return header.split(';').flatMap((part) => {
    const eq = part.indexOf('=')
    if (eq === -1) return []
    const name = part.slice(0, eq).trim()
    const value = part.slice(eq + 1).trim()
    return name ? [{ name, value }] : []
  })
}

export async function getServerSession(request?: NextRequest): Promise<{
  user: { id: string; email: string } | null
  profile: Profile | null
}> {
  let allCookies: { name: string; value: string }[]

  if (request) {
    allCookies = request.cookies.getAll()
  } else {
    const h = await headers()
    const cookieHeader = h.get('cookie') ?? ''
    allCookies = parseCookieHeader(cookieHeader)
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return allCookies
        },
        setAll() {
          // intentionally no-op — cookies are managed by the response
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { user: null, profile: null }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    user: { id: user.id, email: user.email ?? '' },
    profile: profile as Profile | null,
  }
}
