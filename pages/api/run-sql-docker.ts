import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";    
import { decrypt } from "@/lib/encryption";

// Credentials cache
const credentialsCache = new Map<string, { credential: any; password: string; timestamp: number }>();
const CRED_CACHE_TTL = 10 * 60 * 1000;

const SQL_EXECUTOR_URL = process.env.SQL_EXECUTOR_URL || 'http://localhost:5001';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST allowed" });
    }

    const { query, examId, userEmail = 'anonymous' } = req.body;

    if (!query || !examId) {
        return res.status(400).json({ error: "Missing query or examId" });
    }

    const startTime = Date.now();
    console.log(`\n📊 [${new Date().toISOString()}] SQL Query Request from ${userEmail}`);

    try {
        // Get credentials (keep existing getCredentials function)
        const { credential, password } = await getCredentials(examId);

        if (!credential) {
            return res.status(404).json({
                error: "SQL credentials not found for this exam",
            });
        }

        // Call SQL microservice
        const response = await fetch(`${SQL_EXECUTOR_URL}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                serverType: credential.server_type,
                credentials: {
                    host: credential.host,
                    port: credential.port,
                    username: credential.username,
                    password: password,
                    database: credential.database_name,
                },
                examId,
                userEmail,
            }),
        });

        const result = await response.json();
        const totalTime = Date.now() - startTime;

        console.log(`✅ Request completed in ${totalTime}ms`);

        if (!result.success) {
            return res.status(200).json({
                error: result.error,
                executionTime: result.executionTime,
            });
        }

        return res.status(200).json({
            columns: result.columns,
            rows: result.rows,
            rowCount: result.rowCount,
            executionTime: result.executionTime,
            totalTime,
        });

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