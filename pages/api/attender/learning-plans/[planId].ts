import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { planId } = req.query;

    console.log(planId)

    const client = await pool.connect();

    try {
        // Get learning plan details
        const planResult = await client.query(
            `SELECT * FROM "LearningPlan" WHERE id = $1`,
            [planId]
        );

        if (planResult.rowCount === 0) {
            return res.status(404).json({ error: 'Learning plan not found' });
        }

        // Get user's progress
        const progressResult = await client.query(
            `SELECT * FROM "UserLearningPlan" 
             WHERE "planId" = $1 AND "userEmail" = $2`,
            [planId, session.user.email]
        );

        if (progressResult.rowCount === 0) {
            return res.status(403).json({ error: 'You are not assigned to this learning plan' });
        }

        const plan = planResult.rows[0];
        const userProgress = progressResult.rows[0];

        // Parse JSON fields
        plan.weeks = typeof plan.weeks === 'string' ? JSON.parse(plan.weeks) : plan.weeks;
        userProgress.progress = typeof userProgress.progress === 'string'
            ? JSON.parse(userProgress.progress)
            : userProgress.progress;

        // Update last accessed time
        await client.query(
            `UPDATE "UserLearningPlan" 
             SET "lastAccessedAt" = NOW() 
             WHERE id = $1`,
            [userProgress.id]
        );

        return res.status(200).json({
            success: true,
            plan,
            userProgress
        });
    } catch (error: any) {
        console.error('Database Error:', error);
        return res.status(500).json({
            error: 'Failed to fetch learning plan',
            message: error.message
        });
    } finally {
        client.release();
    }
}