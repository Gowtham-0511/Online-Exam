import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";
import { query } from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { examId } = req.query;

    try {
        // Get active exam sessions with latest activity
        const sessionsQuery = `
            WITH LatestActivity AS (
                SELECT 
                    "examId",
                    "userEmail",
                    MAX("timestamp") as "lastActivity"
                FROM "UserExamActions"
                GROUP BY "examId", "userEmail"
            ),
            QuestionProgress AS (
                SELECT 
                    "examId",
                    "userEmail",
                    COUNT(DISTINCT "questionIndex") as "questionsAttempted",
                    MAX("questionIndex") as "currentQuestion"
                FROM "UserExamActions"
                WHERE "actionType" IN ('question_view', 'answer_update', 'code_run')
                GROUP BY "examId", "userEmail"
            )
            SELECT 
                s."examId",
                s."email" as "userEmail",
                s."userName",
                a.title as "examTitle",
                s."submittedAt" as "startTime",
                EXTRACT(EPOCH FROM (NOW() - s."submittedAt"))::INTEGER as "timeElapsed",
                jsonb_array_length(a.questions::jsonb) as "totalQuestions",
                COALESCE(qp."questionsAttempted", 0) as "questionsAttempted",
                COALESCE(qp."currentQuestion", 1) as "currentQuestion",
                la."lastActivity",
                CASE 
                    WHEN s."submittedAt" IS NOT NULL THEN 'completed'
                    WHEN EXTRACT(EPOCH FROM (NOW() - la."lastActivity")) > 300 THEN 'paused'
                    ELSE 'active'
                END as "status"
            FROM submissions s
            INNER JOIN "Assessment" a ON s."examId" = a.title
            LEFT JOIN LatestActivity la ON la."examId" = s."examId" AND la."userEmail" = s."email"
            LEFT JOIN QuestionProgress qp ON qp."examId" = s."examId" AND qp."userEmail" = s."email"
            WHERE s."submittedAt" IS NULL
            ${examId ? 'AND (s."examId" = $1 OR a.title = $1)' : ''}
            ORDER BY la."lastActivity" DESC NULLS LAST;
        `;

        const sessions = await pool.query(
            sessionsQuery,
            examId ? [examId] : []
        );

        return res.status(200).json(sessions.rows);
    } catch (error) {
        console.error("Live sessions error:", error);
        return res.status(500).json({ error: "Failed to fetch live sessions" });
    }
}