import { NextApiRequest, NextApiResponse } from "next";
import redis from "@/lib/queueManager";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST allowed" });
    }

    const { queueType } = req.body; // 'python', 'sql', or 'all'

    try {
        let clearedQueues: string[] = [];

        if (queueType === 'python' || queueType === 'all') {
            // Clear Python queue
            await redis.del('exam:queue:python');
            await redis.del('exam:active:python');

            // Reset Python stats but keep completed/failed counts
            const stats = await redis.hgetall('exam:stats');
            await redis.hset('exam:stats', 'waiting', 0);
            await redis.hset('exam:stats', 'active', 0);

            clearedQueues.push('Python');
            console.log('🧹 Python queue cleared');
        }

        if (queueType === 'sql' || queueType === 'all') {
            // Clear SQL queue
            await redis.del('exam:queue:sql');
            await redis.del('exam:active:sql');

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