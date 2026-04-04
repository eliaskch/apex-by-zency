import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register']
const PROTECTED_PREFIX = '/dashboard'

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const isProtectedPath = pathname.startsWith(PROTECTED_PREFIX)

  // Le token est en mémoire côté client — on vérifie le cookie refresh pour SSR
  const hasRefreshCookie = request.cookies.has('refresh_token')

  if (isProtectedPath && !hasRefreshCookie) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isPublicPath && hasRefreshCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
}
