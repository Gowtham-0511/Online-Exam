import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { examId, email } = req.query;

    if (!examId || !email) {
        return res.status(400).json({
            error: "Missing required parameters: examId, email"
        });
    }

    const client = await pool.connect();

    try {
        const query = `
      SELECT *
      FROM "exam_progress"
      WHERE "email" = $1 AND "examId" = $2
      ORDER BY "updatedAt" DESC
      LIMIT 1;
    `;

        const result = await client.query(query, [email, examId]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: "No saved progress found"
            });
        }

        const progress = result.rows[0];

        // Parse JSON fields
        progress.answers = JSON.parse(progress.answers || '[]');
        progress.mcqAnswers = JSON.parse(progress.mcqAnswers || '{}');
        progress.flaggedQuestions = JSON.parse(progress.flaggedQuestions || '[]');
        progress.questionTimeSpent = JSON.parse(progress.questionTimeSpent || '{}');
        progress.codeRunCounts = JSON.parse(progress.codeRunCounts || '{}');

        return res.status(200).json({
            success: true,
            progress,
        });

    } catch (error: any) {
        console.error("Error loading exam progress:", error);
        return res.status(500).json({
            error: "Failed to load progress",
            details: error.message,
        });
    } finally {
        client.release();
    }
}