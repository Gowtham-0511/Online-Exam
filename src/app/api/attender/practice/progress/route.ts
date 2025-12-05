import pool from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  try {
    const progressQuery = `
        SELECT * FROM "PracticeProgress"
        WHERE email = $1
    `;
    const progressResult = await pool.query(progressQuery, [email]);

    const statsQuery = `
        SELECT 
            COUNT(DISTINCT pq.id) as "totalQuestions",
            COUNT(DISTINCT CASE WHEN ps."isPassed" THEN pq.id END) as "completedQuestions",
            AVG(ps.score) as "averageScore",
            COUNT(ps.id) as "totalAttempts",
            SUM(CASE WHEN ps."isPassed" THEN 1 ELSE 0 END) as "successfulAttempts"
        FROM "PracticeQuestions" pq
        LEFT JOIN "PracticeSubmissions" ps ON pq.id = ps."practiceQuestionId" AND ps.email = $1
        WHERE pq."generatedFor" = $1
    `;
    const statsResult = await pool.query(statsQuery, [email]);

    const languageQuery = `
        SELECT 
            pq.language,
            COUNT(DISTINCT pq.id) as total,
            COUNT(DISTINCT CASE WHEN ps."isPassed" THEN pq.id END) as completed,
            AVG(ps.score) as "avgScore"
        FROM "PracticeQuestions" pq
        LEFT JOIN "PracticeSubmissions" ps ON pq.id = ps."practiceQuestionId" AND ps.email = $1
        WHERE pq."generatedFor" = $1
        GROUP BY pq.language
    `;
    const languageResult = await pool.query(languageQuery, [email]);

    const topicQuery = `
        SELECT 
            pq.topic,
            COUNT(DISTINCT pq.id) as total,
            COUNT(DISTINCT CASE WHEN ps."isPassed" THEN pq.id END) as completed,
            AVG(ps.score) as "avgScore"
        FROM "PracticeQuestions" pq
        LEFT JOIN "PracticeSubmissions" ps ON pq.id = ps."practiceQuestionId" AND ps.email = $1
        WHERE pq."generatedFor" = $1
        GROUP BY pq.topic
    `;
    const topicResult = await pool.query(topicQuery, [email]);

    const recentQuery = `
        SELECT 
            ps.id,
            ps."submittedAt",
            ps."isPassed",
            ps.score,
            pq."questionTitle",
            pq.language,
            pq.topic
        FROM "PracticeSubmissions" ps
        JOIN "PracticeQuestions" pq ON ps."practiceQuestionId" = pq.id
        WHERE ps.email = $1
        ORDER BY ps."submittedAt" DESC
        LIMIT 10
    `;
    const recentResult = await pool.query(recentQuery, [email]);

    return NextResponse.json(
      {
        progress: progressResult.rows[0] || {
          totalPracticeQuestions: 0,
          questionsCompleted: 0,
          questionsAttempted: 0,
          currentStreak: 0,
          averageScore: 0,
        },
        statistics: statsResult.rows[0],
        languageBreakdown: languageResult.rows,
        topicBreakdown: topicResult.rows,
        recentActivity: recentResult.rows,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get Practice Progress Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch practice progress" },
      { status: 500 }
    );
  }
}
