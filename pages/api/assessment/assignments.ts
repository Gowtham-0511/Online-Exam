import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { assessmentId, type, userEmails, batchAssignments } = req.body;

    if (!assessmentId || !type) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        await pool.query('BEGIN');

        // Remove existing user assignments
        if (type === 'user' || type === 'both') {
            await pool.query(
                'DELETE FROM "AssessmentUserMapping" WHERE "assessmentId" = $1',
                [assessmentId]
            );
        }

        // Remove existing batch assignments
        if (type === 'batch' || type === 'both') {
            await pool.query(
                'DELETE FROM "AssessmentBatchMapping" WHERE "assessmentId" = $1',
                [assessmentId]
            );
        }

        // Add new user assignments
        if (userEmails && userEmails.length > 0) {
            for (const email of userEmails) {
                await pool.query(
                    `INSERT INTO "AssessmentUserMapping" ("assessmentId", "userEmail", "createdAt", "updatedAt")
                     VALUES ($1, $2, NOW(), NOW())`,
                    [assessmentId, email]
                );
            }
        }

        // Add new batch assignments
        if (batchAssignments && batchAssignments.length > 0) {
            for (const batch of batchAssignments) {
                await pool.query(
                    `INSERT INTO "AssessmentBatchMapping" ("assessmentId", "batchId", "startTime", "endTime", "isActive", "createdAt")
                     VALUES ($1, $2, $3, $4, $5, NOW())`,
                    [assessmentId, batch.batchId, batch.startTime, batch.endTime, batch.isActive]
                );
            }
        }

        await pool.query('COMMIT');
        return res.status(200).json({ success: true });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error("Error updating assignments:", error);
        return res.status(500).json({ error: "Failed to update assignments" });
    }
}