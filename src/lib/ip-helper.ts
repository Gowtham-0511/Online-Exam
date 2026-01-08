import { headers } from 'next/headers';

export async function getClientIp() {
    const headersList = await headers();
    // Retrieve IP from x-forwarded-for header (standard for proxies like Nginx)
    let ip = headersList.get('x-forwarded-for') || 'unknown';

    if (ip.includes(',')) {
        ip = ip.split(',')[0];
    }
    return ip;
}
