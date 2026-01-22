import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  try {
    const examsResult = await pool.query(
      `SELECT id, title FROM "Assessment" 
       WHERE "createdBy" = $1 
       OR "id" IN (
           SELECT "assessmentId" FROM "AssessmentShares" WHERE "sharedWithEmail" = $1
       )`,
      [email]
    );

    const exams = examsResult.rows;

    if (exams.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const examIds = exams.map((e: any) => e.id);
    const examTitles = exams.map((e: any) => e.title);
    logger.info("Exam Titles: %o", examTitles);

    // 2️⃣ Build a dynamic placeholder list ($1, $2, ...)
    const placeholders = examIds.map((_, idx) => `$${idx + 1}`).join(",");

    logger.info("Fetching submissions for exam IDs: %o", examIds);

    const submissionsResult = await pool.query(
      `SELECT * 
       FROM "submissions"
       WHERE "examId" IN (${placeholders})
       ORDER BY "submittedAt" DESC`,
      examTitles
    );

    logger.info("Submissions found: %d", submissionsResult.rows.length);

    return NextResponse.json(submissionsResult.rows, { status: 200 });
  } catch (error) {
    logger.error("Error fetching submissions by examiner %s:", email, error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
