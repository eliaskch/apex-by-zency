import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register']
const PROTECTED_PREFIX = '/dashboard'

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const isProtectedPath = pathname.startsWith(PROTECTED_PREFIX)

  // Cookie posé par JS après login (domaine frontend)
  // Le refresh_token httpOnly est sur le domaine backend — non accessible ici
  const hasSession = request.cookies.has('apex_session')

  if (isProtectedPath && !hasSession) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isPublicPath && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
}
