import { Pool } from "pg";
import logger from "@/lib/logger";

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: 5432,

    max: 10, // Reduced from 20 to prevent excessive resource usage
    min: 0, // Allow pool to scale down to 0 connections when idle
    idleTimeoutMillis: 10000, // Close idle connections after 10 seconds
    connectionTimeoutMillis: 10000, // Wait up to 10s for a new connection
    maxUses: 7500,
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,

    // ssl: { rejectUnauthorized: false } // Uncomment if needed
});

// Handle pool errors to prevent crashes
pool.on('error', (err, client) => {
    logger.error('Unexpected error on idle client', err);
});

// Graceful shutdown
// Graceful shutdown
process.on('SIGINT', async () => {
    await pool.end();
    logger.info('Pool has ended');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await pool.end();
    logger.info('Pool has ended');
    process.exit(0);
});

export default pool;