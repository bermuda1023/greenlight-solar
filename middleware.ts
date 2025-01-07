import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes
const PUBLIC_ROUTES = ['/authentication/signin', '/authentication/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get Supabase session token from cookies
  const supabaseToken = request.cookies.get('sb-access-token');

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!supabaseToken) {
      const signInUrl = new URL('/authentication/signin', request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}
