import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_IPS = [
    '127.0.0.1',
    // '::1',
    '103.3.231.222',
    '103.3.231.219',
];

const PROTECTED_ROUTES = ['/learning'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isProtectedRoute = PROTECTED_ROUTES.some(route =>
        pathname.startsWith(route)
    );

    if (!isProtectedRoute) {
        return NextResponse.next();
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] :
        request.headers.get('x-real-ip') ||
        'unknown';

    console.log(`Access attempt to ${pathname} from IP: ${ip}`);

    if (!ALLOWED_IPS.includes(ip)) {
        const url = request.nextUrl.clone();
        url.pathname = '/403';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/learning/:path*'],
};