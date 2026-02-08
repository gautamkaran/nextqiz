
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    // Protect teacher routes
    if (pathname.startsWith('/teacher')) {
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    // Create an explicit "login" and "register" page access control if needed
    // e.g. redirect to dashboard if already logged in
    if ((pathname === '/login' || pathname === '/register') && token) {
        return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/teacher/:path*', '/login', '/register'],
};
