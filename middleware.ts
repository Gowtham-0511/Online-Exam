import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Allowed IPs for /learning route
const ALLOWED_IPS = [
  '103.3.231.219',
  '103.208.231.166',
  '103.3.231.222',
];

function getClientIP(request: NextRequest): string | null {
  // Try to get IP from various headers (in order of preference)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, get the first one (original client)
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP.trim();
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }
  
  return null;
}

export function middleware(request: NextRequest) {
  // Only apply IP restriction to /learning route
  if (request.nextUrl.pathname.startsWith('/learning')) {
    const clientIP = getClientIP(request);
    
    console.log(`[IP Check] /learning accessed from IP: ${clientIP}`);
    
    // Check if IP is in allowed list
    if (!clientIP || !ALLOWED_IPS.includes(clientIP)) {
      console.log(`[IP Check] Access denied for IP: ${clientIP}`);
      
      // Return 403 Forbidden
      return new NextResponse(
        JSON.stringify({
          error: 'Access Forbidden',
          message: 'You do not have permission to access this resource.',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    console.log(`[IP Check] Access granted for IP: ${clientIP}`);
  }
  
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: '/learning/:path*',
};
