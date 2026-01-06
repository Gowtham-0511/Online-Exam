import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function POST(request: Request) {
  const {
    examId,
    language,
    duration,
    createdBy,
    questions,
    isExamProctored,
    useExcelQuestions,
    questionConfig,
    sqlCredentialId,
  } = await request.json();

  if (!examId || !language || !duration || !createdBy) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const checkQuery = `
        SELECT COUNT(*) AS count
        FROM "Assessment"
        WHERE title = $1
    `;
    const checkResult = await pool.query(checkQuery, [examId]);

    if (parseInt(checkResult.rows[0].count) > 0) {
      return NextResponse.json(
        { error: "Exam with this title already exists" },
        { status: 409 }
      );
    }

    const insertQuery = `
        INSERT INTO "Assessment" (
            title,
            language,
            duration,
            "createdBy",
            "createdAt",
            "isExamProctored",
            "isGeneratedFromExcel",
            "questionConfig",
            questions,
            "sqlCredentialId"
        )
        VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10
        )
        RETURNING id;
    `;

    const result = await pool.query(insertQuery, [
      examId,
      language,
      duration,
      createdBy,
      new Date().toISOString(),
      isExamProctored ? true : false,
      useExcelQuestions ? true : false,
      JSON.stringify(questionConfig || {}),
      JSON.stringify(questions || []),
      sqlCredentialId,
    ]);

    const assessmentId = result.rows[0].id;
    logger.info("Assessment created via Organizer: %s by %s", examId, createdBy);

    return NextResponse.json({ success: true, assessmentId }, { status: 201 });
  } catch (error) {
    logger.error("Error creating assessment (Organizer):", error);
    return NextResponse.json(
      { error: "Failed to create assessment" },
      { status: 500 }
    );
  }
}
