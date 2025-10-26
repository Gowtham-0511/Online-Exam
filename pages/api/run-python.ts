import { NextApiRequest, NextApiResponse } from "next";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import pool from "@/lib/db";
import { promisify } from "util";

const execAsync = promisify(exec);

// Concurrency control - OPTIMIZED FOR 17 STUDENTS
const MAX_CONCURRENT = 8; // Increased from 5 to handle 17 students comfortably
let currentExecutions = 0;
const queue: Array<() => void> = [];

// Add queue monitoring
const getQueueStats = () => ({
    active: currentExecutions,
    waiting: queue.length,
    total: currentExecutions + queue.length
});

async function acquireLock(): Promise<void> {
    if (currentExecutions < MAX_CONCURRENT) {
        currentExecutions++;
        return;
    }
    return new Promise((resolve) => {
        queue.push(resolve);
    });
}

function releaseLock() {
    currentExecutions--;
    const next = queue.shift();
    if (next) {
        currentExecutions++;
        next();
    }
}

// File pooling - reuse directories
const TEMP_BASE = path.join(process.cwd(), "temp", "python_exec");
fs.mkdirSync(TEMP_BASE, { recursive: true });

// Cache exam files
const examFilesCache = new Map<string, { files: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getExamFiles(examId: string) {
    const cached = examFilesCache.get(examId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.files;
    }

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

    // Log queue status for monitoring
    const statsBeforeQueue = getQueueStats();
    console.log(`Queue status: ${statsBeforeQueue.active} active, ${statsBeforeQueue.waiting} waiting`);

    // Acquire execution slot
    await acquireLock();

    const timestamp = Date.now();
    const uniqueId = `${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    const filename = `code_${uniqueId}.py`;
    const tempDir = path.join(TEMP_BASE, uniqueId);

    try {
        // Create temp directory
        fs.mkdirSync(tempDir, { recursive: true });

        // Copy exam files if needed (with caching)
        if (examId) {
            const files = await getExamFiles(examId);

            // Copy files in parallel
            await Promise.all(
                files.map(async (file) => {
                    const sourceFile = path.join(process.cwd(), 'public', file.file_url);
                    const destFile = path.join(tempDir, file.file_name);

                    if (fs.existsSync(sourceFile)) {
                        await fs.promises.copyFile(sourceFile, destFile);
                    }
                })
            );
        }

        // Write user code
        await fs.promises.writeFile(path.join(tempDir, filename), code);

        // Execute with better resource limits
        const { stdout, stderr } = await execAsync(
            `python "${filename}"`,
            {
                timeout: 10000,
                cwd: tempDir,
                maxBuffer: 1024 * 1024, // 1MB buffer
                env: {
                    ...process.env,
                    PYTHONUNBUFFERED: '1', // Better output handling
                }
            }
        );

        // Cleanup
        await fs.promises.rm(tempDir, { recursive: true, force: true });

        return res.status(200).json({
            output: stdout || stderr,
            success: !stderr
        });

    } catch (error: any) {
        // Cleanup on error
        if (fs.existsSync(tempDir)) {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        }

        return res.status(200).json({
            output: error.stderr || error.message,
            success: false
        });
    } finally {
        releaseLock();
    }
}

// Cleanup old cache periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of examFilesCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            examFilesCache.delete(key);
        }
    }
}, CACHE_TTL);