import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { examId } = req.query;

    if (!examId) {
        return res.status(400).json({ error: "examId is required" });
    }

    try {
        const analyticsQuery = `
            WITH QuestionStats AS (
                SELECT 
                    "questionId",
                    "questionIndex",
                    COUNT(DISTINCT "userEmail") as "totalAttempts",
                    AVG("timeSpent") as "averageTime",
                    SUM(CASE WHEN "actionType" = 'code_run' THEN "codeRunCount" ELSE 0 END) as "codeRuns"
                FROM "UserExamActions"
                WHERE "examId" = $1
                GROUP BY "questionId", "questionIndex"
            ),
            CompletionStats AS (
                SELECT 
                    "questionIndex",
                    COUNT(DISTINCT "userEmail") as "completedCount"
                FROM "UserExamActions"
                WHERE "examId" = $1
                AND "actionType" = 'answer_update'
                AND "metadata"->>'answerLength' IS NOT NULL
                AND CAST("metadata"->>'answerLength' AS INTEGER) > 50
                GROUP BY "questionIndex"
            )
            SELECT 
                qs."questionId",
                qs."questionIndex",
                qs."totalAttempts",
                COALESCE(qs."averageTime"::INTEGER, 0) as "averageTime",
                COALESCE(qs."codeRuns", 0) as "codeRuns",
                CASE 
                    WHEN qs."totalAttempts" > 0 THEN 
                        ROUND((COALESCE(cs."completedCount", 0)::NUMERIC / qs."totalAttempts") * 100)
                    ELSE 0
                END as "completionRate"
            FROM QuestionStats qs
            LEFT JOIN CompletionStats cs ON cs."questionIndex" = qs."questionIndex"
            ORDER BY qs."questionIndex";
        `;

        const analytics = await pool.query(analyticsQuery, [examId]);

        const questionsQuery = `
            SELECT questions
            FROM "Assessment"
            WHERE title = $1;
        `;

        const questionsResult = await pool.query(questionsQuery, [examId]);
        const questions = questionsResult.rows[0]?.questions || [];

        const enrichedAnalytics = analytics.rows.map(stat => {
            const question = questions[stat.questionIndex - 1] || {};
            return {
                ...stat,
                questionTitle: question.question?.substring(0, 50) + '...' || `Question ${stat.questionIndex}`,
                difficulty: question.difficulty || 'medium',
                marks: question.marks || 0
            };
        });

        return res.status(200).json(enrichedAnalytics);
    } catch (error) {
        console.error("Question analytics error:", error);
        return res.status(500).json({ error: "Failed to fetch question analytics" });
    }
}