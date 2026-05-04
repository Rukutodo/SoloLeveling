import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Public routes
  const publicRoutes = ['/login'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isApiAuth = pathname.startsWith('/api/auth');

  // Allow public routes and auth API
  if (isPublicRoute || isApiAuth) {
    // Redirect logged-in users away from login page
    if (isLoggedIn && isPublicRoute) {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
    }
    return NextResponse.next();
  }

  // Protect all other routes
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
