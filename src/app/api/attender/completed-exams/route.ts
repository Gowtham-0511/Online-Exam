import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
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

        const result = await pool.query(query, [email]);

        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        logger.error("Error fetching completed exams for %s:", email, error);
        return NextResponse.json(
            { error: "Failed to fetch completed exams" },
            { status: 500 }
        );
    }
}
