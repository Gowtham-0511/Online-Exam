import { Pool } from "pg";
import logger from "@/lib/logger";

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: 5432,

    max: 20,
    min: 2, // Keep at least 2 connections alive to prevent "cold start" latency
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // Fail fast if we can't get a connection (5s)
    maxUses: 7500,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000, // Faster keepalive (10s) for aggressive firewalls

    // Timeouts to prevent 504s
    statement_timeout: 30000, // Terminate any query taking > 30s
    query_timeout: 30000,     // Node.js side timeout for queries
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