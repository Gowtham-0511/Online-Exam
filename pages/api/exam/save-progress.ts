import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const {
        examId,
        email,
        answers,
        mcqAnswers,
        activeQuestionIndex,
        timeLeft,
        flaggedQuestions,
        questionTimeSpent,
        codeRunCounts,
        lastSaved,
    } = req.body;

    // Validate required fields
    if (!examId || !email) {
        return res.status(400).json({
            error: "Missing required fields: examId, email"
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const query = `
      INSERT INTO "exam_progress" (
        "email",
        "examId",
        "answers",
        "mcqAnswers",
        "activeQuestionIndex",
        "timeLeft",
        "flaggedQuestions",
        "questionTimeSpent",
        "codeRunCounts",
        "lastSaved",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT ("email", "examId") 
      DO UPDATE SET
        "answers" = EXCLUDED."answers",
        "mcqAnswers" = EXCLUDED."mcqAnswers",
        "activeQuestionIndex" = EXCLUDED."activeQuestionIndex",
        "timeLeft" = EXCLUDED."timeLeft",
        "flaggedQuestions" = EXCLUDED."flaggedQuestions",
        "questionTimeSpent" = EXCLUDED."questionTimeSpent",
        "codeRunCounts" = EXCLUDED."codeRunCounts",
        "lastSaved" = EXCLUDED."lastSaved",
        "updatedAt" = NOW()
      RETURNING "id";
    `;

        const values = [
            email,
            examId,
            JSON.stringify(answers || []),
            JSON.stringify(mcqAnswers || {}),
            activeQuestionIndex || 0,
            timeLeft || 0,
            JSON.stringify(flaggedQuestions || []),
            JSON.stringify(questionTimeSpent || {}),
            JSON.stringify(codeRunCounts || {}),
            lastSaved || new Date().toISOString(),
        ];

        const result = await client.query(query, values);
        const progressId = result.rows[0]?.id;

        await client.query('COMMIT');

        console.log(`✅ Progress saved: ${progressId} for ${email}`);

        return res.status(200).json({
            success: true,
            message: "Progress saved successfully",
            progressId,
            savedAt: new Date().toISOString(),
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error("Error saving exam progress:", error);

        return res.status(500).json({
            error: "Failed to save progress",
            details: error.message,
        });
    } finally {
        client.release();
    }
}