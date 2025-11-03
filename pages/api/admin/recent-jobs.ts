import { NextApiRequest, NextApiResponse } from "next";
import redis from "@/lib/queueManager";

interface RecentJob {
    id: string;
    type: 'python' | 'sql';
    userEmail: string;
    timestamp: string;
    status: 'success' | 'failed' | 'pending';
    executionTime?: number;
    error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Only GET allowed" });
    }

    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const jobs: RecentJob[] = [];

        // Get recent Python jobs from Redis sorted set
        const pythonJobs = await redis.zrevrange(
            'exam:recent:python',
            0,
            limit / 2 - 1,
            'WITHSCORES'
        );

        // Parse Python jobs (format: [value, score, value, score, ...])
        for (let i = 0; i < pythonJobs.length; i += 2) {
            try {
                const jobData = JSON.parse(pythonJobs[i]);
                const timestamp = parseInt(pythonJobs[i + 1]);

                jobs.push({
                    id: jobData.id || `python_${timestamp}`,
                    type: 'python',
                    userEmail: jobData.userEmail || 'unknown',
                    timestamp: new Date(timestamp).toISOString(),
                    status: jobData.success ? 'success' : 'failed',
                    executionTime: jobData.executionTime,
                    error: jobData.error,
                });
            } catch (parseError) {
                console.error('Failed to parse Python job:', parseError);
            }
        }

        // Get recent SQL jobs from Redis sorted set
        const sqlJobs = await redis.zrevrange(
            'exam:recent:sql',
            0,
            limit / 2 - 1,
            'WITHSCORES'
        );

        // Parse SQL jobs
        for (let i = 0; i < sqlJobs.length; i += 2) {
            try {
                const jobData = JSON.parse(sqlJobs[i]);
                const timestamp = parseInt(sqlJobs[i + 1]);

                jobs.push({
                    id: jobData.id || `sql_${timestamp}`,
                    type: 'sql',
                    userEmail: jobData.userEmail || 'unknown',
                    timestamp: new Date(timestamp).toISOString(),
                    status: jobData.success ? 'success' : 'failed',
                    executionTime: jobData.executionTime,
                    error: jobData.error,
                });
            } catch (parseError) {
                console.error('Failed to parse SQL job:', parseError);
            }
        }

        // Sort all jobs by timestamp (most recent first)
        jobs.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Limit to requested number
        const limitedJobs = jobs.slice(0, limit);

        return res.status(200).json({
            jobs: limitedJobs,
            count: limitedJobs.length,
            timestamp: new Date().toISOString(),
        });

    } catch (error: any) {
        console.error('Failed to get recent jobs:', error);

        // Return empty array on error so dashboard doesn't break
        return res.status(200).json({
            jobs: [],
            count: 0,
            error: error.message,
        });
    }
}