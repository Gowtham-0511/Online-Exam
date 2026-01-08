import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { getClientIp } from '@/lib/ip-helper';

export async function GET() {
    const ip = await getClientIp();

    logger.info('Test log entry generated from /api/log-test', { ip });
    logger.error('Test error entry generated from /api/log-test', { ip });

    return NextResponse.json({
        message: 'Logs generated with IP. Check logs/app.log and logs/error.log',
        ip
    });
}
