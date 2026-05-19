import { redirect } from 'next/navigation'

// Root path — middleware will redirect authenticated users to their role's page.
// Unauthenticated users are redirected to /login by middleware.
// This handles the case where middleware lets an authenticated user land here.
export default function RootPage() {
  redirect('/login')
}
