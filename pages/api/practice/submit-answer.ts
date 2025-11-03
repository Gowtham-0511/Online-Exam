import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end();

    const {
        practiceQuestionId,
        email,
        userName,
        submittedCode,
        language,
        executionResult
    } = req.body;

    if (!practiceQuestionId || !email || !submittedCode || !executionResult) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get current attempt number
        const attemptQuery = `
            SELECT COALESCE(MAX("attemptNumber"), 0) + 1 as "nextAttempt"
            FROM "PracticeSubmissions"
            WHERE "practiceQuestionId" = $1 AND email = $2
        `;
        const attemptResult = await client.query(attemptQuery, [practiceQuestionId, email]);
        const attemptNumber = attemptResult.rows[0].nextAttempt;

        // Calculate score (percentage of test cases passed)
        const score = executionResult.totalTestCases > 0
            ? (executionResult.testCasesPassed / executionResult.totalTestCases) * 100
            : 0;

        const isPassed = executionResult.success;

        // Generate AI feedback on the code (optional but recommended)
        const aiFeedback = {
            codeQuality: "Good structure",
            suggestions: ["Consider edge cases", "Add comments"],
            testResults: executionResult.testResults
        };

        // Insert submission
        const insertQuery = `
            INSERT INTO "PracticeSubmissions" (
                "practiceQuestionId", email, "userName", "submittedCode",
                language, "isPassed", "testCasesPassed", "totalTestCases",
                "executionTime", "errorMessage", "aiFeedback", score, "attemptNumber"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
        `;

        const submissionResult = await client.query(insertQuery, [
            practiceQuestionId,
            email,
            userName,
            submittedCode,
            language,
            isPassed,
            executionResult.testCasesPassed,
            executionResult.totalTestCases,
            executionResult.executionTime,
            executionResult.error || null,
            aiFeedback,
            score,
            attemptNumber
        ]);

        // Update question attempt count and success rate
        const updateQuestionQuery = `
            UPDATE "PracticeQuestions"
            SET 
                "attemptCount" = "attemptCount" + 1,
                "successRate" = (
                    SELECT AVG(CASE WHEN "isPassed" THEN 100 ELSE 0 END)
                    FROM "PracticeSubmissions"
                    WHERE "practiceQuestionId" = $1
                )
            WHERE id = $1
        `;
        await client.query(updateQuestionQuery, [practiceQuestionId]);

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            submissionId: submissionResult.rows[0].id,
            isPassed,
            score,
            attemptNumber,
            executionResult
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error("Submit Practice Answer Error:", error);
        return res.status(500).json({ error: "Failed to submit answer" });
    } finally {
        client.release();
    }
}