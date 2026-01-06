import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const query = `select id , email , "userName" , "examId" , "answersWithQuestionIds" , disqualified , "submittedAt" , ai_feedback  from submissions s order by "examId" , email`;

    logger.info("Admin fetching all submissions");

    const result = await pool.query(query);

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    logger.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
