import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const query = `
        SELECT 
            ps.id,
            ps.title,
            ps.topic,
            ps.difficulty,
            ps."totalQuestions",
            ps."createdAt",
             (
                SELECT COUNT(DISTINCT "practiceQuestionId")
                FROM "PracticeSubmissions" sub
                JOIN "PracticeQuestions" pq ON sub."practiceQuestionId" = pq.id
                WHERE pq."practiceSetId" = ps.id
            ) as "questionsAttempted",
             (
                SELECT COALESCE(SUM(score), 0)
                FROM "PracticeSubmissions" sub
                JOIN "PracticeQuestions" pq ON sub."practiceQuestionId" = pq.id
                WHERE pq."practiceSetId" = ps.id
            ) as "totalScore",
             (
                SELECT "userName"
                FROM "PracticeSubmissions" sub
                JOIN "PracticeQuestions" pq ON sub."practiceQuestionId" = pq.id
                WHERE pq."practiceSetId" = ps.id
                LIMIT 1
            ) as "userName",
             (
                SELECT "email"
                FROM "PracticeSubmissions" sub
                JOIN "PracticeQuestions" pq ON sub."practiceQuestionId" = pq.id
                WHERE pq."practiceSetId" = ps.id
                LIMIT 1
            ) as "email"
        FROM "PracticeSets" ps
        ORDER BY ps.id DESC
    `;

    const result = await pool.query(query);

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    logger.error("Error fetching practice sets:", error);
    return NextResponse.json(
      { error: "Failed to fetch practice sets" },
      { status: 500 }
    );
  }
}
