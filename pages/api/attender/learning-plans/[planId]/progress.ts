import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { planId } = req.query;
    const { weekNumber, type, value } = req.body;

    const client = await pool.connect();

    try {
        // Get current progress
        const result = await client.query(
            `SELECT progress, weeks FROM "UserLearningPlan" ulp
             JOIN "LearningPlan" lp ON ulp."planId" = lp.id
             WHERE ulp."planId" = $1 AND ulp."userEmail" = $2`,
            [planId, session.user.email]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Learning plan not found' });
        }

        const currentProgress = typeof result.rows[0].progress === 'string'
            ? JSON.parse(result.rows[0].progress)
            : result.rows[0].progress;

        const weeks = typeof result.rows[0].weeks === 'string'
            ? JSON.parse(result.rows[0].weeks)
            : result.rows[0].weeks;

        // Update progress logic here
        // Find or create week progress
        let weekProgress = currentProgress.find((p: any) => p.weekId === weekNumber);
        if (!weekProgress) {
            weekProgress = {
                weekId: weekNumber,
                completedTopics: [],
                completedGoals: [],
                completedResources: [],
                completedAssessments: [],
                startedAt: new Date().toISOString()
            };
            currentProgress.push(weekProgress);
        }

        // Get week data
        const week = weeks.find((w: any) => w.weekNumber === weekNumber);
        if (!week) {
            return res.status(400).json({ error: 'Invalid week number' });
        }

        // Update based on type
        switch (type) {
            case 'topic':
                if (!weekProgress.completedTopics.includes(value)) {
                    weekProgress.completedTopics.push(value);
                } else {
                    // Toggle off if already completed
                    weekProgress.completedTopics = weekProgress.completedTopics.filter((t: string) => t !== value);
                }
                break;

            case 'goal':
                if (!weekProgress.completedGoals.includes(value)) {
                    weekProgress.completedGoals.push(value);
                } else {
                    weekProgress.completedGoals = weekProgress.completedGoals.filter((g: string) => g !== value);
                }
                break;

            case 'resource':
                if (!weekProgress.completedResources.includes(value)) {
                    weekProgress.completedResources.push(value);
                } else {
                    weekProgress.completedResources = weekProgress.completedResources.filter((r: string) => r !== value);
                }
                break;

            case 'assessment':
                const existingAssessment = weekProgress.completedAssessments.find(
                    (a: any) => (typeof a === 'string' ? a : a.title) === value
                );

                if (!existingAssessment) {
                    weekProgress.completedAssessments.push({
                        title: value,
                        completedAt: new Date().toISOString()
                    });
                } else {
                    // Toggle off if already completed
                    weekProgress.completedAssessments = weekProgress.completedAssessments.filter(
                        (a: any) => (typeof a === 'string' ? a : a.title) !== value
                    );
                }
                break;
        }

        // Calculate overall progress
        let totalItems = 0;
        let completedItems = 0;

        weeks.forEach((w: any, idx: number) => {
            const wp = currentProgress.find((p: any) => p.weekId === w.weekNumber) || {
                completedTopics: [],
                completedGoals: [],
                completedResources: [],
                completedAssessments: []
            };

            totalItems += w.topics.length + w.goals.length + w.resources.length + w.assessments.length;
            completedItems += wp.completedTopics.length + wp.completedGoals.length +
                wp.completedResources.length + wp.completedAssessments.length;
        });

        const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        // Determine current week (first incomplete week)
        let currentWeek = 1;
        for (let i = 0; i < weeks.length; i++) {
            const w = weeks[i];
            const wp = currentProgress.find((p: any) => p.weekId === w.weekNumber);

            if (!wp) {
                currentWeek = w.weekNumber;
                break;
            }

            const weekTotal = w.topics.length + w.goals.length + w.resources.length + w.assessments.length;
            const weekCompleted = (wp.completedTopics?.length || 0) +
                (wp.completedGoals?.length || 0) +
                (wp.completedResources?.length || 0) +
                (wp.completedAssessments?.length || 0);

            if (weekCompleted < weekTotal) {
                currentWeek = w.weekNumber;
                break;
            }

            if (i === weeks.length - 1) {
                currentWeek = w.weekNumber;
            }
        }

        // Determine status
        let status = 'in-progress';
        if (overallProgress === 100) {
            status = 'completed';
        } else if (overallProgress === 0) {
            status = 'not-started';
        }

        // Update database
        await client.query(
            `UPDATE "UserLearningPlan" 
            SET progress = $1, 
                "overallProgress" = $2,
                "currentWeek" = $3,
                status = $4::varchar,
                "lastAccessedAt" = NOW(),
                "completedAt" = CASE WHEN $4::varchar = 'completed' THEN NOW() ELSE "completedAt" END
            WHERE "planId" = $5 AND "userEmail" = $6`,
            [
                JSON.stringify(currentProgress),
                overallProgress,
                currentWeek,
                status,
                planId,
                session.user.email
            ]
        );


        return res.status(200).json({
            success: true,
            progress: currentProgress,
            overallProgress,
            currentWeek,
            status
        });
    } catch (error: any) {
        console.error('Progress Update Error:', error);
        return res.status(500).json({
            error: 'Failed to update progress',
            message: error.message
        });
    } finally {
        client.release();
    }
}