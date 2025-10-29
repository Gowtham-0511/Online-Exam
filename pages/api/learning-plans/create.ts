import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
        name,
        description,
        duration,
        language,
        difficulty,
        weeks,
        assignedUsers,
        createdBy
    } = req.body;

    // Validation
    if (!name?.trim() || !description?.trim() || !duration || !language || !difficulty) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!assignedUsers || assignedUsers.length === 0) {
        return res.status(400).json({ error: 'At least one user must be assigned' });
    }

    if (!weeks || weeks.length === 0) {
        return res.status(400).json({ error: 'Learning plan must have at least one week' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const planId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // When creating the learning plan, ensure weeks includes questions
        await client.query(
            `INSERT INTO "LearningPlan" (
                id, name, description, language, difficulty, duration, 
                weeks, "createdBy", "isActive", tags
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                planId,
                name,
                description,
                language,
                difficulty,
                duration,
                JSON.stringify(weeks), // weeks already contains questions from frontend
                createdBy || session.user.email,
                true,
                `{${language},${difficulty}}`
            ]
        );

        console.log(assignedUsers);

        // Fetch user details
        const employeesResult = await client.query(
            `SELECT "Email", "Name" FROM "Employees" WHERE "Email" = ANY($1)`,
            [assignedUsers]
        );

        const externalUsersResult = await client.query(
            `SELECT email, name FROM "ExternalUsers" WHERE email = ANY($1)`,
            [assignedUsers]
        );

        const userMap = new Map<string, string>();
        employeesResult.rows.forEach(emp => userMap.set(emp.Email, emp.Name));
        externalUsersResult.rows.forEach(user => userMap.set(user.email, user.name));

        // Insert user assignments
        for (const email of assignedUsers) {
            const ulpId = `ulp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const userName = userMap.get(email) || email;

            await client.query(
                `INSERT INTO "UserLearningPlan" (
                    id, "planId", "userEmail", "userName", "startDate", 
                    "currentWeek", status, progress, "overallProgress"
                ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8)`,
                [ulpId, planId, email, userName, 1, 'not-started', '[]', 0]
            );

            // Create notification
            const notifId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await client.query(
                `INSERT INTO "LearningPlanNotification" (
                    id, "userEmail", "planId", type, title, message, read
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    notifId,
                    email,
                    planId,
                    'assignment',
                    'New Learning Plan Assigned',
                    `You have been assigned to the learning plan: ${name}`,
                    false
                ]
            );
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Learning plan created successfully',
            planId,
            assignedCount: assignedUsers.length
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Database Error:', error);
        return res.status(500).json({
            error: 'Failed to create learning plan',
            message: error.message
        });
    } finally {
        client.release();
    }
}