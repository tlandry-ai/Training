import { NextResponse } from 'next/server'

export function middleware(request) {
  const auth = request.cookies.get('auth')
  const isApi = request.nextUrl.pathname.startsWith('/api/auth')

  if (isApi) return NextResponse.next()

  if (!auth || auth.value !== process.env.APP_PASSWORD) {
    if (request.nextUrl.pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
