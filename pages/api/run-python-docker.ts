import { NextApiRequest, NextApiResponse } from "next";
import { QueueManager } from "@/lib/queueManager";
import dockerPythonExecutor from "@/lib/dockerPythonExecutor";
import pool from "@/lib/db";

const pythonQueue = new QueueManager('python');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST allowed" });
    }

    const { code, examId, userEmail = 'anonymous' } = req.body;

    if (!code) {
        return res.status(400).json({ error: "No Python code provided" });
    }

    const startTime = Date.now();
    console.log(`\n🐍 [${new Date().toISOString()}] Python Execution Request from ${userEmail}`);

    try {
        // Check rate limit
        const isAllowed = await pythonQueue.checkRateLimit(userEmail, 10);
        if (!isAllowed) {
            return res.status(429).json({
                error: "Rate limit exceeded. Maximum 10 executions per minute.",
                retryAfter: 60,
            });
        }

        // Get queue stats
        const stats = await pythonQueue.getStats();
        console.log(`📊 Queue: ${stats.active} active, ${stats.waiting} waiting`);

        // If queue is too long, reject immediately
        if (stats.waiting > 50) {
            return res.status(503).json({
                error: "Server is very busy. Please try again in a few moments.",
                queueStats: stats,
            });
        }

        // Add job to queue
        const jobId = await pythonQueue.addJob({
            type: 'python',
            code,
            examId: examId || 'test',
            userEmail,
            priority: examId ? 10 : 5,
        });

        console.log(`📝 Job ${jobId} queued`);

        // Process immediately (pass userEmail)
        processJob(jobId, code, examId, userEmail);

        // Wait for result
        try {
            const result = await pythonQueue.getResult(jobId, 35000);

            const totalTime = Date.now() - startTime;
            console.log(`✅ Request completed in ${totalTime}ms`);

            return res.status(200).json({
                output: result.result.output || result.result.error || "Code executed successfully",
                success: result.success,
                executionTime: result.result.executionTime,
                totalTime,
            });

        } catch (timeoutError) {
            console.error(`⏱️ Job ${jobId} timed out`);
            return res.status(408).json({
                error: "Request timeout. The server is busy, please try again.",
                executionTime: Date.now() - startTime,
            });
        }

    } catch (error: any) {
        console.error(`❌ Error:`, error.message);

        return res.status(500).json({
            error: "Internal server error. Please try again.",
            message: error.message,
        });
    }
}

// Background job processor (now with userEmail parameter)
async function processJob(jobId: string, code: string, examId: string | undefined, userEmail: string) {
    const startTime = Date.now();

    try {
        console.log(`⚙️ Processing job ${jobId}`);

        // Get exam files if examId provided
        let files: Array<{ fileName: string; content: Buffer }> = [];

        if (examId && pool) {
            try {
                const client = await pool.connect();
                try {
                    const result = await client.query(
                        'SELECT file_name, file_url FROM exam_files WHERE exam_id = $1',
                        [examId]
                    );

                    const fs = require('fs').promises;
                    const path = require('path');

                    for (const row of result.rows) {
                        const filePath = path.join(process.cwd(), 'public', row.file_url);
                        try {
                            const content = await fs.readFile(filePath);
                            files.push({
                                fileName: row.file_name,
                                content,
                            });
                        } catch (err) {
                            console.warn(`⚠️ File not found: ${row.file_name}`);
                        }
                    }
                } finally {
                    client.release();
                }
            } catch (dbError) {
                console.warn('⚠️ Could not fetch exam files:', dbError);
            }
        }

        // Execute in Docker
        const result = await dockerPythonExecutor.execute({
            code,
            examId,
            files,
            timeout: 20000,
            memoryLimit: 512 * 1024 * 1024,
        });

        // Store result in queue
        await pythonQueue.storeResult(jobId, result, result.success);

        // Store in recent jobs history (Redis sorted set)
        const redis = (await import('@/lib/queueManager')).default;
        const jobData = {
            id: jobId,
            userEmail: userEmail,
            success: result.success,
            executionTime: result.executionTime,
            error: result.error,
        };

        await redis.zadd(
            'exam:recent:python',
            Date.now(),
            JSON.stringify(jobData)
        );

        // Keep only last 100 jobs
        await redis.zremrangebyrank('exam:recent:python', 0, -101);

        console.log(`✅ Job ${jobId} completed successfully`);

    } catch (error: any) {
        console.error(`❌ Job ${jobId} failed:`, error.message);

        const result = {
            output: '',
            error: error.message,
            executionTime: Date.now() - startTime,
            success: false,
        };

        await pythonQueue.storeResult(jobId, result, false);

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
            'exam:recent:python',
            Date.now(),
            JSON.stringify(jobData)
        );

        await redis.zremrangebyrank('exam:recent:python', 0, -101);
    }
}