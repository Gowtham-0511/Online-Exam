import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const query = `
        SELECT 
            ps.id, 
            pq."questionDescription", 
            ps.email, 
            ps."userName", 
            ps."submittedCode", 
            ps."language", 
            ps."isPassed", 
            ps."testCasesPassed", 
            ps."totalTestCases", 
            ps."executionTime", 
            ps."aiFeedback", 
            ps.score, 
            ps."attemptNumber"
        FROM "PracticeSubmissions" ps
        JOIN "PracticeQuestions" pq ON ps."practiceQuestionId" = pq.id
        ORDER BY ps.id DESC
    `;

    const result = await pool.query(query);

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    logger.error("Error fetching practice submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
