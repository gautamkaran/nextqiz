import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

interface SessionPayload extends jwt.JwtPayload {
    id: string;
    username: string;
    role: string;
}

function verifyToken(token: string): SessionPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (typeof decoded === 'object' && decoded !== null && 'id' in decoded) {
            return decoded as SessionPayload;
        }
        return null;
    } catch (error) {
        return null;
    }
}

export function proxy(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;
    const origin = request.headers.get('origin') ?? '';

    // Define allowed origins for CORS
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        process.env.NEXT_PUBLIC_APP_URL,
    ].filter(Boolean);

    const isAllowedOrigin = allowedOrigins.includes(origin);

    // Handle CORS preflight requests for API routes
    if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
        return new NextResponse(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0] || '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    // Verify JWT token for protected routes
    let session: SessionPayload | null = null;
    if (token) {
        session = verifyToken(token);
    }

    // Protect teacher routes - require authentication
    if (pathname.startsWith('/teacher')) {
        if (!session) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    // Redirect authenticated users away from login/register pages
    if ((pathname === '/login' || pathname === '/register') && session) {
        return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
    }

    // Create response with enhanced headers
    const response = NextResponse.next();

    // Add CORS headers for API routes
    if (pathname.startsWith('/api/')) {
        response.headers.set(
            'Access-Control-Allow-Origin',
            isAllowedOrigin ? origin : allowedOrigins[0] || '*'
        );
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    // Add security headers for all responses
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Add custom header for debugging (remove in production if needed)
    if (session) {
        response.headers.set('X-User-Id', session.id);
        response.headers.set('X-User-Role', session.role);
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         * - Public folder assets
         */
        '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
};
