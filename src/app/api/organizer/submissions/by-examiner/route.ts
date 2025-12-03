import pool from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  try {
    const examsResult = await pool.query(
      `SELECT id, title FROM "Assessment" WHERE "createdBy" = $1`,
      [email]
    );

    const exams = examsResult.rows;

    if (exams.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const examIds = exams.map((e: any) => e.id);
    const examTitles = exams.map((e: any) => e.title);
    console.log("Exam Titles:", examTitles);

    // 2️⃣ Build a dynamic placeholder list ($1, $2, ...)
    const placeholders = examIds.map((_, idx) => `$${idx + 1}`).join(",");

    console.log("Fetching submissions for exam IDs:", examIds);

    const submissionsResult = await pool.query(
      `SELECT * 
       FROM "submissions"
       WHERE "examId" IN (${placeholders})
       ORDER BY "submittedAt" DESC`,
      examTitles
    );

    console.log("Submissions found:", submissionsResult.rows.length);

    return NextResponse.json(submissionsResult.rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
