import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Session cookie name - must match the value in lib/auth.ts
const SESSION_COOKIE_NAME = "lastterm_session";

// Middleware to protect routes - redirect unauthenticated users to auth.
// Only allows /auth for unauthenticated users.
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Get session cookie to check if user is authenticated
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = !!sessionCookie;
  
  // Public routes accessible without authentication
  const publicRoutes = ["/auth", "/"];
  const isPublicRoute = publicRoutes.includes(pathname);
  
  // If not authenticated and trying to access protected route, redirect to auth
  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }
  
  // If authenticated and trying to access /auth, allow it (user can re-login if needed)
  
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    // Run middleware on all routes except static files and api
    "/((?!api|_next/static|_next/image|favicon.ico).*)"
  ]
};
