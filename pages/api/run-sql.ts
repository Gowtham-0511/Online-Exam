import { NextApiRequest, NextApiResponse } from "next";
import sql from 'mssql';
import pool from "@/lib/db";
import { decrypt } from '@/lib/encryption';
import { Pool } from 'pg';

const MAX_CONCURRENT_SQL = 10;
const QUERY_TIMEOUT = 30000;
let currentSqlExecutions = 0;

interface QueueItem {
    resolve: () => void;
    reject: (error: Error) => void;
    timestamp: number;
}

const sqlQueue: QueueItem[] = [];

async function acquireSqlLock(): Promise<void> {
    if (currentSqlExecutions < MAX_CONCURRENT_SQL) {
        currentSqlExecutions++;
        console.log(`✓ SQL lock acquired. Active: ${currentSqlExecutions}/${MAX_CONCURRENT_SQL}`);
        return;
    }

    return new Promise((resolve, reject) => {
        const queueItem: QueueItem = { resolve, reject, timestamp: Date.now() };
        sqlQueue.push(queueItem);
        console.log(`⏳ SQL query queued. Position: ${sqlQueue.length}`);

        setTimeout(() => {
            const index = sqlQueue.indexOf(queueItem);
            if (index !== -1) {
                sqlQueue.splice(index, 1);
                reject(new Error(`Too many students querying database. Please wait and try again.`));
            }
        }, QUERY_TIMEOUT);
    });
}

function releaseSqlLock() {
    currentSqlExecutions--;
    console.log(`✓ SQL lock released. Active: ${currentSqlExecutions}/${MAX_CONCURRENT_SQL}`);

    const next = sqlQueue.shift();
    if (next) {
        currentSqlExecutions++;
        next.resolve();
    }
}

const credentialsCache = new Map<string, { credential: any, password: string, timestamp: number }>();
const CRED_CACHE_TTL = 10 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end("Only POST allowed");

    const { query, examId } = req.body;
    console.log(`\n📊 [${new Date().toISOString()}] SQL Query Request for exam: ${examId}`);

    if (!query) return res.status(400).json({ error: "Missing query" });
    if (!examId) return res.status(400).json({ error: "Missing examId" });

    const startTime = Date.now();
    let lockAcquired = false;

    try {
        await acquireSqlLock();
        lockAcquired = true;

        const { credential, password } = await getCredentials(examId);

        if (!credential) {
            return res.status(404).json({ error: "SQL credentials not found for this exam" });
        }

        if (credential.server_type === 'postgres') {
            return await executePostgresQuery(query, credential, password, res, startTime);
        } else if (credential.server_type === 'ssms') {
            return await executeSqlServerQuery(query, credential, password, res, startTime);
        } else {
            return res.status(400).json({ error: "Unknown server type" });
        }

    } catch (err: any) {
        const executionTime = Date.now() - startTime;
        console.error(`❌ SQL execution failed in ${executionTime}ms:`, err.message);

        let userMessage = err.message;
        if (err.message.includes("timeout")) {
            userMessage = "Query timeout: Your query is taking too long. Try to optimize it.";
        } else if (err.message.includes("syntax")) {
            userMessage = "SQL Syntax Error: " + err.message;
        }

        return res.status(200).json({
            error: userMessage,
            executionTime
        });

    } finally {
        if (lockAcquired) releaseSqlLock();

        const totalTime = Date.now() - startTime;
        console.log(`⏱️  Total SQL request time: ${totalTime}ms\n`);
    }
}

async function getCredentials(examId: string) {
    const cached = credentialsCache.get(examId);
    if (cached && Date.now() - cached.timestamp < CRED_CACHE_TTL) {
        console.log(`📦 Using cached credentials for exam ${examId}`);
        return { credential: cached.credential, password: cached.password };
    }

    console.log(`🔄 Fetching credentials for exam ${examId}`);
    const client = await pool.connect();

    try {
        const assessmentResult = await client.query(
            'SELECT "sqlCredentialId" FROM "Assessment" WHERE title = $1',
            [examId]
        );

        if (assessmentResult.rows.length === 0) {
            throw new Error("Assessment not found");
        }

        const sqlCredentialId = assessmentResult.rows[0].sqlCredentialId;
        if (!sqlCredentialId) {
            throw new Error("No SQL credentials configured for this exam");
        }

        const credentialResult = await client.query(
            'SELECT * FROM sql_credentials WHERE id = $1',
            [sqlCredentialId]
        );

        if (credentialResult.rows.length === 0) {
            throw new Error("SQL credentials not found");
        }

        const credential = credentialResult.rows[0];
        const password = decrypt(credential.password);

        credentialsCache.set(examId, { credential, password, timestamp: Date.now() });

        return { credential, password };

    } finally {
        client.release();
    }
}

async function executePostgresQuery(
    query: string,
    credential: any,
    password: string,
    res: NextApiResponse,
    startTime: number
) {
    let pgPool;
    try {
        pgPool = new Pool({
            host: credential.host,
            port: credential.port,
            user: credential.username,
            password: password,
            database: credential.database_name,
            connectionTimeoutMillis: 5000,
            max: 20,
            idleTimeoutMillis: 30000,
            statement_timeout: 25000,
        });

        console.log(`🐘 Executing PostgreSQL query...`);
        const result = await pgPool.query(query);

        const columns = result.fields.map(field => field.name);
        const rows = result.rows;

        await pgPool.end();

        const executionTime = Date.now() - startTime;
        console.log(`✅ PostgreSQL query completed in ${executionTime}ms, returned ${rows.length} rows`);

        return res.status(200).json({
            columns,
            rows,
            executionTime,
            rowCount: rows.length
        });

    } catch (err: any) {
        if (pgPool) await pgPool.end();
        throw err;
    }
}

async function executeSqlServerQuery(
    query: string,
    credential: any,
    password: string,
    res: NextApiResponse,
    startTime: number
) {
    let sqlPool;
    try {
        const config: sql.config = {
            user: credential.username,
            password: password,
            server: credential.host,
            port: credential.port,
            database: credential.database_name,
            options: {
                encrypt: true,
                trustServerCertificate: true,
            },
            connectionTimeout: 5000,
            requestTimeout: 25000,
            pool: {
                max: 20,
                min: 0,
                idleTimeoutMillis: 30000
            }
        } as sql.config;

        console.log(`🔷 Executing SQL Server query...`);
        sqlPool = await sql.connect(config);
        const result = await sqlPool.request()
            .query(query);

        await sqlPool.close();

        const columns = result.recordset.length > 0 ? Object.keys(result.recordset[0]) : [];
        const rows = result.recordset;

        const executionTime = Date.now() - startTime;
        console.log(`✅ SQL Server query completed in ${executionTime}ms, returned ${rows.length} rows`);

        return res.status(200).json({
            columns,
            rows,
            executionTime,
            rowCount: rows.length
        });

    } catch (err: any) {
        if (sqlPool) await sqlPool.close();
        throw err;
    }
}

setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of credentialsCache.entries()) {
        if (now - value.timestamp > CRED_CACHE_TTL) {
            credentialsCache.delete(key);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} expired credential cache entries`);
    }

    if (currentSqlExecutions > 0 || sqlQueue.length > 0) {
        console.log(`📊 SQL Load: ${currentSqlExecutions} active, ${sqlQueue.length} waiting`);
    }
}, CRED_CACHE_TTL);