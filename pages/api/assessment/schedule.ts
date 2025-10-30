import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end();

    const {
        assessmentId,
        batchSchedules,
        userSchedules,
    } = req.body;

    if (!assessmentId) {
        return res.status(400).json({ error: "Missing assessmentId" });
    }

    if ((!batchSchedules || batchSchedules.length === 0) &&
        (!userSchedules || userSchedules.length === 0)) {
        return res.status(400).json({ error: "No schedules provided" });
    }

    try {
        // Handle batch schedules if provided
        if (batchSchedules && batchSchedules.length > 0) {
            await pool.query(
                `DELETE FROM "AssessmentBatchMapping" WHERE "assessmentId" = $1`,
                [assessmentId]
            );

            const batchInsertQuery = `
                INSERT INTO "AssessmentBatchMapping" (
                    "assessmentId", "batchId", "startTime", "endTime"
                )
                VALUES ($1, $2, $3, $4)
            `;

            for (const schedule of batchSchedules) {
                await pool.query(batchInsertQuery, [
                    assessmentId,
                    schedule.batchId,
                    schedule.startTime ? new Date(schedule.startTime).toISOString() : null,
                    schedule.endTime ? new Date(schedule.endTime).toISOString() : null,
                ]);
            }
        }

        // Handle user schedules if provided
        if (userSchedules && userSchedules.length > 0) {
            await pool.query(
                `DELETE FROM "AssessmentUserMapping" WHERE "assessmentId" = $1`,
                [assessmentId]
            );

            const userInsertQuery = `
                INSERT INTO "AssessmentUserMapping" (
                    "assessmentId", "userEmail", startTime, endTime, "createdAt"
                )
                VALUES ($1, $2, $3, $4, $5)
            `;

            for (const schedule of userSchedules) {
                await pool.query(userInsertQuery, [
                    assessmentId,
                    schedule.userEmail,
                    schedule.startTime ? new Date(schedule.startTime).toISOString() : null,
                    schedule.endTime ? new Date(schedule.endTime).toISOString() : null,
                    new Date().toISOString()
                ]);
            }
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error scheduling exam:", error);
        return res.status(500).json({ error: "Failed to schedule exam" });
    }
}