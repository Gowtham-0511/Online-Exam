// Interface for our logger to ensure consistency
interface Logger {
    info: (message: string, ...meta: any[]) => void;
    error: (message: string, ...meta: any[]) => void;
    warn: (message: string, ...meta: any[]) => void;
    debug: (message: string, ...meta: any[]) => void;
    // Winston specific methods that might be called (optional)
    add?: (transport: any) => void;
}

let logger: Logger;

// Check if we are on the server side
const isServer = typeof window === 'undefined';

if (isServer) {
    // Server-side: Use Winston dynamically to avoid build errors in client bundles
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const winston = require('winston');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');

    const logDir = 'logs';

    const winstonLogger = winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss',
            }),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.json()
        ),
        defaultMeta: { service: 'sysrank-service' },
        transports: [
            new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
            new winston.transports.File({ filename: path.join(logDir, 'app.log') }),
        ],
    });

    // Always add console transport
    winstonLogger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
    }));

    logger = winstonLogger;
} else {
    // Client-side: Use console
    logger = {
        info: (message: string, ...meta: any[]) => console.log(`[INFO] ${message}`, ...meta),
        error: (message: string, ...meta: any[]) => console.error(`[ERROR] ${message}`, ...meta),
        warn: (message: string, ...meta: any[]) => console.warn(`[WARN] ${message}`, ...meta),
        debug: (message: string, ...meta: any[]) => console.debug(`[DEBUG] ${message}`, ...meta),
    };
}

export default logger;
