import { NextApiRequest, NextApiResponse } from "next";
import redis from "@/lib/queueManager";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST allowed" });
    }

    try {
        await redis.hset('exam:stats:python', {
            'waiting': 0,
            'active': 0,
            'completed': 0,
            'failed': 0,
        });

        await redis.hset('exam:stats:sql', {
            'waiting': 0,
            'active': 0,
            'completed': 0,
            'failed': 0,
        });

        console.log('🔄 All statistics reset to zero');

        return res.status(200).json({
            success: true,
            message: 'All statistics reset successfully',
            timestamp: new Date().toISOString(),
        });

    } catch (error: any) {
        console.error('Failed to reset stats:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to reset statistics',
            message: error.message,
        });
    }
}