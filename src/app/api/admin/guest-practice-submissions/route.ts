import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const query = `
        SELECT 
            id, 
            "sessionId", 
            topic, 
            difficulty, 
            "questionsData", 
            answers, 
            score, 
            "correctAnswers", 
            "totalQuestions", 
            "timeSpent", 
            "completedAt"
        FROM practice_attempts
        ORDER BY "completedAt" DESC
    `;

    const result = await pool.query(query);

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    logger.error("Error fetching guest practice submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
