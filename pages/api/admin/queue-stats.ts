import { NextApiRequest, NextApiResponse } from "next";
import { QueueManager } from "@/lib/queueManager";
import dockerPythonExecutor from "@/lib/dockerPythonExecutor";
import redis from "@/lib/queueManager";

const pythonQueue = new QueueManager('python');
const sqlQueue = new QueueManager('sql');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Only GET allowed" });
    }

    try {
        const pythonStatsRaw = await redis.hgetall('exam:stats:python');
        const pythonStats = {
            waiting: parseInt(pythonStatsRaw.waiting || '0'),
            active: parseInt(pythonStatsRaw.active || '0'),
            completed: parseInt(pythonStatsRaw.completed || '0'),
            failed: parseInt(pythonStatsRaw.failed || '0'),
        };
        const pythonQueueLength = await redis.zcard('exam:queue:python');

        const sqlStatsRaw = await redis.hgetall('exam:stats:sql');
        const sqlStats = {
            waiting: parseInt(sqlStatsRaw.waiting || '0'),
            active: parseInt(sqlStatsRaw.active || '0'),
            completed: parseInt(sqlStatsRaw.completed || '0'),
            failed: parseInt(sqlStatsRaw.failed || '0'),
        };
        const sqlQueueLength = await redis.zcard('exam:queue:sql');

        const actualPythonWaiting = await redis.zcard('exam:queue:python');
        const actualSqlWaiting = await redis.zcard('exam:queue:sql');

        const pythonActiveKeys = await redis.keys('exam:active:python_*');
        const sqlActiveKeys = await redis.keys('exam:active:sql_*');

        const dockerStats = await dockerPythonExecutor.getStats();

        let redisConnected = false;
        let redisMemory = 'N/A';

        try {
            await redis.ping();
            redisConnected = true;

            const info = await redis.info('memory');
            const match = info.match(/used_memory_human:(.*)/);
            if (match) {
                redisMemory = match[1].trim();
            }
        } catch (error) {
            console.error('Redis ping failed:', error);
        }

        return res.status(200).json({
            python: {
                waiting: actualPythonWaiting,
                active: pythonActiveKeys.length,
                completed: pythonStats.completed,
                failed: pythonStats.failed,
                queueLength: pythonQueueLength,
            },
            sql: {
                waiting: actualSqlWaiting,
                active: sqlActiveKeys.length,
                completed: sqlStats.completed,
                failed: sqlStats.failed,
                queueLength: sqlQueueLength,
            },
            docker: dockerStats,
            redis: {
                connected: redisConnected,
                memoryUsed: redisMemory,
            },
            timestamp: new Date().toISOString(),
        });

    } catch (error: any) {
        console.error('Failed to get queue stats:', error);
        return res.status(500).json({
            error: 'Failed to fetch stats',
            message: error.message,
        });
    }
}