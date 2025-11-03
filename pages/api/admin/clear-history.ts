import { NextApiRequest, NextApiResponse } from "next";
import redis from "@/lib/queueManager";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST allowed" });
    }

    const { queueType } = req.body;

    try {
        let clearedQueues: string[] = [];

        if (queueType === 'python' || queueType === 'all') {
            await redis.del('exam:queue:python');

            const pythonActiveKeys = await redis.keys('exam:active:python_*');
            if (pythonActiveKeys.length > 0) {
                await redis.del(...pythonActiveKeys);
            }

            await redis.hset('exam:stats:python', 'waiting', 0);
            await redis.hset('exam:stats:python', 'active', 0);

            clearedQueues.push('Python');
            console.log('🧹 Python queue cleared');
        }

        if (queueType === 'sql' || queueType === 'all') {
            await redis.del('exam:queue:sql');

            const sqlActiveKeys = await redis.keys('exam:active:sql_*');
            if (sqlActiveKeys.length > 0) {
                await redis.del(...sqlActiveKeys);
            }

            await redis.hset('exam:stats:sql', 'waiting', 0);
            await redis.hset('exam:stats:sql', 'active', 0);

            clearedQueues.push('SQL');
            console.log('🧹 SQL queue cleared');
        }

        return res.status(200).json({
            success: true,
            message: `${clearedQueues.join(' and ')} queue(s) cleared successfully`,
            clearedQueues,
            timestamp: new Date().toISOString(),
        });

    } catch (error: any) {
        console.error('Failed to clear queue:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to clear queue',
            message: error.message,
        });
    }
}