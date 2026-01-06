import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

export async function GET() {
    logger.info('Test log entry generated from /api/log-test');
    logger.error('Test error entry generated from /api/log-test');

    return NextResponse.json({ message: 'Logs generated. Check logs/app.log and logs/error.log' });
}
