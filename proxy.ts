import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyDemoToken, COOKIE_NAME } from '@/lib/demo-auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Demo dashboard — verify JWT cookie (no Supabase auth needed)
  if (pathname.startsWith('/demo/dashboard')) {
    const token = request.cookies.get(COOKIE_NAME)?.value
    if (!token) {
      return NextResponse.redirect(new URL('/demo?error=session_expired', request.url))
    }
    const session = await verifyDemoToken(token)
    if (!session) {
      const res = NextResponse.redirect(new URL('/demo?error=session_expired', request.url))
      res.cookies.delete(COOKIE_NAME)
      return res
    }
    const reqHeaders = new Headers(request.headers)
    reqHeaders.set('x-demo-email', session.email)
    return NextResponse.next({ request: { headers: reqHeaders } })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/admin') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/demo/dashboard/:path*'],
}
