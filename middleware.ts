import { NextRequest, NextResponse } from 'next/server'

const TOKEN_COOKIE = 'gcx_auth_token'

// Routes that require a logged-in user
const PROTECTED = ['/tv-admin']

// Routes that logged-in users should not see (redirect away)
const AUTH_ONLY = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(TOKEN_COOKIE)?.value ?? ''

  const isProtected = PROTECTED.some(
    route => pathname === route || pathname.startsWith(route + '/'),
  )
  const isAuthOnly = AUTH_ONLY.some(
    route => pathname === route || pathname.startsWith(route + '/'),
  )

  // No token → redirect protected pages to login
  if (isProtected && !token) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  // Has token → skip the login page, go to home
  if (isAuthOnly && token) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.delete('from')
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Run on all routes except Next internals, static files and API routes
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
