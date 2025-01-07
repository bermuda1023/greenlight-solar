import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Get the pathname from the request
  const { pathname } = request.nextUrl;

  // If it's not a protected route, allow the request to continue
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  // For protected routes, check auth before anything else
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  const { data: { session } } = await supabase.auth.getSession();

  // If no session, redirect to signin immediately
  if (!session) {
    const signInUrl = new URL('/authentication/signin', request.url);
    return NextResponse.redirect(signInUrl);
  }

  return res;
}

// Configure matcher to only run middleware on protected routes
export const config = {
  matcher: '/dashboard/:path*'
}