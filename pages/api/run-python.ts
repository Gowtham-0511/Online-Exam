import { NextApiRequest, NextApiResponse } from "next";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import pool from "@/lib/db";
import { promisify } from "util";

const execAsync = promisify(exec);

const MAX_CONCURRENT = 15;
const QUEUE_TIMEOUT = 30000;
let currentExecutions = 0;

interface QueueItem {
    resolve: () => void;
    reject: (error: Error) => void;
    timestamp: number;
}

const queue: QueueItem[] = [];

const getQueueStats = () => ({
    active: currentExecutions,
    waiting: queue.length,
    total: currentExecutions + queue.length,
    maxConcurrent: MAX_CONCURRENT
});

async function acquireLock(): Promise<void> {
    if (currentExecutions < MAX_CONCURRENT) {
        currentExecutions++;
        console.log(`✓ Lock acquired. Active: ${currentExecutions}/${MAX_CONCURRENT}`);
        return;
    }

    return new Promise((resolve, reject) => {
        const queueItem: QueueItem = {
            resolve,
            reject,
            timestamp: Date.now()
        };

        queue.push(queueItem);
        console.log(`⏳ Added to queue. Position: ${queue.length}, Active: ${currentExecutions}`);

        setTimeout(() => {
            const index = queue.indexOf(queueItem);
            if (index !== -1) {
                queue.splice(index, 1);
                reject(new Error(`Queue timeout: Too many students running code simultaneously. Please wait and try again.`));
            }
        }, QUEUE_TIMEOUT);
    });
}

function releaseLock() {
    currentExecutions--;
    console.log(`✓ Lock released. Active: ${currentExecutions}/${MAX_CONCURRENT}`);

    const next = queue.shift();
    if (next) {
        currentExecutions++;
        console.log(`→ Processing queued request. Remaining in queue: ${queue.length}`);
        next.resolve();
    }
}

const TEMP_BASE = path.join(process.cwd(), "temp", "python_exec");
fs.mkdirSync(TEMP_BASE, { recursive: true });

const examFilesCache = new Map<string, { files: any[], timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000;

async function getExamFiles(examId: string) {
    const cached = examFilesCache.get(examId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`📦 Using cached files for exam ${examId}`);
        return cached.files;
    }

    console.log(`🔄 Fetching files for exam ${examId} from database`);
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT file_name, file_url FROM exam_files WHERE exam_id = $1',
            [examId]
        );
        const files = result.rows;
        examFilesCache.set(examId, { files, timestamp: Date.now() });
        return files;
    } finally {
        client.release();
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end("Only POST allowed");

    const { code, examId } = req.body;
    if (!code) return res.status(400).json({ error: "No Python code provided" });

    const statsBeforeQueue = getQueueStats();
    console.log(`\n📊 [${new Date().toISOString()}] Python Execution Request`);
    console.log(`   Queue Status: ${statsBeforeQueue.active} active, ${statsBeforeQueue.waiting} waiting`);

    const startTime = Date.now();
    let lockAcquired = false;

    try {
        await acquireLock();
        lockAcquired = true;

        const timestamp = Date.now();
        const uniqueId = `${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
        const filename = `code_${uniqueId}.py`;
        const tempDir = path.join(TEMP_BASE, uniqueId);

        try {
            await fs.promises.mkdir(tempDir, { recursive: true });

            if (examId) {
                const files = await getExamFiles(examId);

                if (files.length > 0) {
                    await Promise.all(
                        files.map(async (file) => {
                            const sourceFile = path.join(process.cwd(), 'public', file.file_url);
                            const destFile = path.join(tempDir, file.file_name);

                            if (fs.existsSync(sourceFile)) {
                                await fs.promises.copyFile(sourceFile, destFile);
                            } else {
                                console.warn(`⚠️  File not found: ${sourceFile}`);
                            }
                        })
                    );
                }
            }

            await fs.promises.writeFile(path.join(tempDir, filename), code);

            const { stdout, stderr } = await execAsync(
                `python "${filename}"`,
                {
                    timeout: 15000,
                    cwd: tempDir,
                    maxBuffer: 2 * 1024 * 1024,
                    env: {
                        ...process.env,
                        PYTHONUNBUFFERED: '1',
                        PYTHONDONTWRITEBYTECODE: '1',
                    }
                }
            );

            await fs.promises.rm(tempDir, { recursive: true, force: true });

            const executionTime = Date.now() - startTime;
            console.log(`✅ Execution completed in ${executionTime}ms`);

            return res.status(200).json({
                output: stdout || stderr || "Code executed successfully (no output)",
                success: !stderr,
                executionTime
            });

        } catch (error: any) {
            if (fs.existsSync(tempDir)) {
                await fs.promises.rm(tempDir, { recursive: true, force: true });
            }

            const executionTime = Date.now() - startTime;
            console.error(`❌ Execution failed in ${executionTime}ms:`, error.message);

            let userMessage = error.stderr || error.message;

            if (error.killed || error.signal === 'SIGTERM') {
                userMessage = "⏱️  Code execution timeout (15 seconds). Your code might have an infinite loop or is taking too long.";
            }

            return res.status(200).json({
                output: userMessage,
                success: false,
                executionTime
            });
        }

    } catch (queueError: any) {
        console.error(`❌ Queue error:`, queueError.message);

        return res.status(503).json({
            error: queueError.message,
            queueStats: getQueueStats(),
            message: "Server is busy. Please wait a few seconds and try again."
        });

    } finally {
        if (lockAcquired) {
            releaseLock();
        }

        const totalTime = Date.now() - startTime;
        console.log(`⏱️  Total request time: ${totalTime}ms\n`);
    }
}

setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of examFilesCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            examFilesCache.delete(key);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }

    const stats = getQueueStats();
    if (stats.total > 0) {
        console.log(`📊 Current load: ${stats.active} active, ${stats.waiting} waiting`);
    }
}, CACHE_TTL);

const cleanupTempDir = async () => {
    try {
        const entries = await fs.promises.readdir(TEMP_BASE);
        for (const entry of entries) {
            const fullPath = path.join(TEMP_BASE, entry);
            await fs.promises.rm(fullPath, { recursive: true, force: true });
        }
        console.log('🧹 Cleaned up temp directory on startup');
    } catch (error) {
        console.error('Failed to cleanup temp directory:', error);
    }
};

cleanupTempDir();