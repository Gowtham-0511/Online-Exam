import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const practiceSetId = searchParams.get('id');

        if (!practiceSetId) {
            return NextResponse.json({ error: 'Practice Set ID is required' }, { status: 400 });
        }

        const query = `
            SELECT 
                ps.id as "submissionId",
                ps."submittedCode" as "userCode",
                ps.language,
                ps.score,
                ps."testCasesPassed" as "passedCount",
                ps."totalTestCases" as "totalCount",
                CASE WHEN ps."isPassed" THEN 'Passed' ELSE 'Failed' END as "status",
                pq.id as "questionId",
                pq."questionTitle" as "questionTitle",
                pq."questionDescription" as "questionDescription",
                pq."difficulty",
                pq."testCases"
            FROM "PracticeSubmissions" ps
            JOIN "PracticeQuestions" pq ON ps."practiceQuestionId" = pq.id
            WHERE pq."practiceSetId" = $1
            ORDER BY pq.id ASC
        `;

        const result = await pool.query(query, [practiceSetId]);

        return NextResponse.json(result.rows, { status: 200 });
    } catch (error) {
        logger.error("Error fetching practice set details:", error);
        return NextResponse.json(
            { error: "Failed to fetch practice set details" },
            { status: 500 }
        );
    }
}
