import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    const { email } = req.query;

    try {
        const query = `
            SELECT 
                s.id,
                s."examId",
                s.email,
                s."userName",
                s."submittedAt",
                s.disqualified,
                s.answers,
                s."answersWithQuestionIds",
                s.code,
                s.ai_feedback,
                a.title,
                a.language,
                a.duration,
                a."createdAt",
                (
                    SELECT COALESCE(SUM((feedback->>'marks')::numeric), 0)
                    FROM jsonb_array_elements(s."ai_feedback"::jsonb) AS feedback
                ) AS "totalMarksObtained",
                (
                    SELECT COALESCE(SUM((ans->>'marks')::numeric), 0)
                    FROM jsonb_array_elements(s."answersWithQuestionIds"::jsonb) AS ans
                ) AS "totalPossibleMarks",
                CASE 
                    WHEN (
                        SELECT COALESCE(SUM((ans->>'marks')::numeric), 0)
                        FROM jsonb_array_elements(s."answersWithQuestionIds"::jsonb) AS ans
                    ) > 0 THEN
                        ROUND(
                            (
                                SELECT COALESCE(SUM((feedback->>'marks')::numeric), 0)
                                FROM jsonb_array_elements(s."ai_feedback"::jsonb) AS feedback
                            ) * 100.0 / (
                                SELECT COALESCE(SUM((ans->>'marks')::numeric), 0)
                                FROM jsonb_array_elements(s."answersWithQuestionIds"::jsonb) AS ans
                            ),
                            2
                        )
                    ELSE 0
                END AS "percentage"
            FROM submissions s
            INNER JOIN "Assessment" a 
                ON s."examId" = a.title
            WHERE s.email = $1
            ORDER BY s."submittedAt" DESC;
        `;

        const result = await pool.query(query, [email as string]);

        return res.status(200).json(result.rows);
    } catch (error) {
        console.error("DB error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}