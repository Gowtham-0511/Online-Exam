import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "200mb",
        },
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end();

    const {
        examId,
        language,
        duration,
        createdBy,
        questions,
        isExamProctored,
        useExcelQuestions,
        questionConfig,
        allowedUsers,
        batchSchedules,
    } = req.body;

    console.log(batchSchedules);

    if (!examId || !language || !duration || !createdBy) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const checkQuery = `
        SELECT COUNT(*) AS count
        FROM "Assessment"
        WHERE title = $1
        `;
        const checkResult = await pool.query(checkQuery, [examId]);

        if (parseInt(checkResult.rows[0].count) > 0) {
            return res.status(409).json({ error: "Exam with this title already exists" });
        }

        const insertQuery = `
            INSERT INTO "Assessment" (
                title,
                language,
                duration,
                "createdBy",
                "createdAt",
                "isExamProctored",
                "isGeneratedFromExcel",
                "questionConfig",
                questions,
                "allowedUsers",
                "sqlCredentialId"
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10, 
                $11
            )
            RETURNING id;
        `;

        const result = await pool.query(insertQuery, [
            examId,
            language,
            duration,
            createdBy,
            new Date().toISOString(),
            isExamProctored ? true : false,
            useExcelQuestions ? true : false,
            JSON.stringify(questionConfig || {}),
            JSON.stringify(questions || []),
            allowedUsers?.length ? JSON.stringify(allowedUsers) : null,
            req.body.sqlCredentialId || null,
        ]);

        const assessmentId = result.rows[0].id;

        if (batchSchedules && batchSchedules.length > 0) {
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

        return res.status(200).json({ success: true, assessmentId });
    } catch (error) {
        console.error("Error creating exam:", error);
        return res.status(500).json({ error: "Failed to create exam" });
    }
}
