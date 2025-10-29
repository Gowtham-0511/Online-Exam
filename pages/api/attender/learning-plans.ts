import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const client = await pool.connect();

    try {
        const result = await client.query(
            `SELECT 
                ulp.id,
                ulp."planId",
                lp.name as "planName",
                lp.description as "planDescription",
                lp.language,
                lp.difficulty,
                lp.duration,
                ulp."currentWeek",
                ulp.status,
                ulp."overallProgress",
                ulp."startDate",
                ulp."assignedAt",
                ulp."lastAccessedAt"
            FROM "UserLearningPlan" ulp
            JOIN "LearningPlan" lp ON ulp."planId" = lp.id
            WHERE ulp."userEmail" = $1
            ORDER BY ulp."assignedAt" DESC`,
            [session.user.email]
        );

        return res.status(200).json({
            success: true,
            plans: result.rows
        });
    } catch (error: any) {
        console.error('Database Error:', error);
        return res.status(500).json({
            error: 'Failed to fetch learning plans',
            message: error.message
        });
    } finally {
        client.release();
    }
}