import { NextApiRequest, NextApiResponse } from "next";
import { QueueManager } from "@/lib/queueManager";
import dockerSqlExecutor from "@/lib/dockerSqlExecutor";
import pool from "@/lib/db";
import { decrypt } from "@/lib/encryption";

const sqlQueue = new QueueManager('sql');

// Credentials cache
const credentialsCache = new Map<string, { credential: any; password: string; timestamp: number }>();
const CRED_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST allowed" });
    }

    const { query, examId, userEmail = 'anonymous' } = req.body;

    if (!query) {
        return res.status(400).json({ error: "Missing query" });
    }

    if (!examId) {
        return res.status(400).json({ error: "Missing examId" });
    }

    const startTime = Date.now();
    console.log(`\n🔷 [${new Date().toISOString()}] SQL Query Request from ${userEmail}`);

    try {
        // Validate query first
        const validation = dockerSqlExecutor.validateQuery(query);
        if (!validation.valid) {
            return res.status(400).json({
                error: validation.error,
            });
        }

        // Check rate limit
        const isAllowed = await sqlQueue.checkRateLimit(userEmail, 15);
        if (!isAllowed) {
            return res.status(429).json({
                error: "Rate limit exceeded. Maximum 15 queries per minute.",
                retryAfter: 60,
            });
        }

        // Get queue stats
        const stats = await sqlQueue.getStats();
        console.log(`📊 Queue: ${stats.active} active, ${stats.waiting} waiting`);

        // If queue is too long, reject immediately
        if (stats.waiting > 50) {
            return res.status(503).json({
                error: "Database server is very busy. Please try again in a few moments.",
                queueStats: stats,
            });
        }

        // Get credentials
        const { credential, password } = await getCredentials(examId);

        if (!credential) {
            return res.status(404).json({
                error: "SQL credentials not found for this exam",
            });
        }

        // Add job to queue
        const jobId = await sqlQueue.addJob({
            type: 'sql',
            code: query,
            examId,
            userEmail,
            priority: 10,
        });

        console.log(`📝 Job ${jobId} queued`);

        // Process immediately
        processJob(jobId, query, credential, password, userEmail);

        // Wait for result
        try {
            const result = await sqlQueue.getResult(jobId, 35000);

            const totalTime = Date.now() - startTime;
            console.log(`✅ Request completed in ${totalTime}ms`);

            if (!result.success) {
                return res.status(200).json({
                    error: result.result.error,
                    executionTime: result.result.executionTime,
                });
            }

            return res.status(200).json({
                columns: result.result.columns,
                rows: result.result.rows,
                rowCount: result.result.rowCount,
                executionTime: result.result.executionTime,
                totalTime,
            });

        } catch (timeoutError) {
            console.error(`⏱️ Job ${jobId} timed out`);
            return res.status(408).json({
                error: "Query timeout. Please try again with a simpler query.",
                executionTime: Date.now() - startTime,
            });
        }

    } catch (error: any) {
        console.error(`❌ Error:`, error.message);

        return res.status(500).json({
            error: "Database error. Please try again.",
            message: error.message,
        });
    }
}

// Get credentials from cache or database
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

// Background job processor (updated with userEmail)
async function processJob(
    jobId: string,
    query: string,
    credential: any,
    password: string,
    userEmail: string
) {
    const startTime = Date.now();

    try {
        console.log(`⚙️ Processing SQL job ${jobId}`);

        // Execute query
        const result = await dockerSqlExecutor.execute({
            query,
            serverType: credential.server_type,
            credentials: {
                host: credential.host,
                port: credential.port,
                username: credential.username,
                password: password,
                database: credential.database_name,
            },
            timeout: 25000,
        });

        // Store result in queue
        await sqlQueue.storeResult(jobId, result, result.success);

        // Store in recent jobs history
        const redis = (await import('@/lib/queueManager')).default;
        const jobData = {
            id: jobId,
            userEmail: userEmail,
            success: result.success,
            executionTime: result.executionTime,
            error: result.error,
        };

        await redis.zadd(
            'exam:recent:sql',
            Date.now(),
            JSON.stringify(jobData)
        );

        // Keep only last 100 jobs
        await redis.zremrangebyrank('exam:recent:sql', 0, -101);

        console.log(`✅ SQL job ${jobId} completed successfully`);

    } catch (error: any) {
        console.error(`❌ SQL job ${jobId} failed:`, error.message);

        const result = {
            columns: [],
            rows: [],
            rowCount: 0,
            executionTime: Date.now() - startTime,
            success: false,
            error: error.message,
        };

        await sqlQueue.storeResult(jobId, result, false);

        // Store failed job in history
        const redis = (await import('@/lib/queueManager')).default;
        const jobData = {
            id: jobId,
            userEmail: userEmail,
            success: false,
            executionTime: Date.now() - startTime,
            error: error.message,
        };

        await redis.zadd(
            'exam:recent:sql',
            Date.now(),
            JSON.stringify(jobData)
        );

        await redis.zremrangebyrank('exam:recent:sql', 0, -101);
    }
}

// Cleanup credentials cache
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
        console.log(`🧹 Cleaned ${cleaned} expired SQL credential cache entries`);
    }
}, CRED_CACHE_TTL); 