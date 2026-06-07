import { cookies } from 'next/headers'
import LoginPage from '@/components/login-page'
import AppShell from '@/components/app-shell'

export default async function Page() {
  const cookieStore = await cookies()
  const c = cookieStore.get('temple_auth')
  const authed = Boolean(c && c.value && c.value === process.env.APP_PASSWORD)

  if (!authed) {
    return <LoginPage />
  }

  return <AppShell />
}
