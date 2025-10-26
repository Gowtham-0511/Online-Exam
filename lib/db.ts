import { Pool } from "pg";

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: 5432,

    max: 20,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    maxUses: 7500,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,

    // ssl: { rejectUnauthorized: false } // Uncomment if needed
});

// Handle pool errors to prevent crashes
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await pool.end();
    console.log('Pool has ended');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await pool.end();
    console.log('Pool has ended');
    process.exit(0);
});

export default pool;