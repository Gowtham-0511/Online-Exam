import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db/db";
import logger from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  logger.info("Fetching assessment ID: %s", id);

  try {
    const query = `
      SELECT *
      FROM "Assessment"
      WHERE "id" = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const exam = result.rows[0];

    // Safely parse JSON fields
    try {
      exam.questions = exam.questions ? JSON.parse(exam.questions) : [];
      exam.questionConfig = exam.questionConfig
        ? JSON.parse(exam.questionConfig)
        : {};
    } catch {
      return NextResponse.json(
        { error: "Invalid question format" },
        { status: 500 }
      );
    }

    return NextResponse.json(exam, { status: 200 });
  } catch (error) {
    logger.error("DB error fetching assessment %s:", id, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  console.log(body);
  const { duration, isExamProctored, assignmentType, title } = body;

  // Validate input
  if (
    duration === undefined ||
    isExamProctored === undefined ||
    !assignmentType ||
    !title
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {


    const originalAssessmentNamequery = `
      SELECT "title"
      FROM "Assessment"
      WHERE "id" = $1
    `;

    const originalAssessmentNameResult = await pool.query(originalAssessmentNamequery, [id]);

    if (originalAssessmentNameResult.rowCount === 0) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const originalAssessmentName = originalAssessmentNameResult.rows[0].title;

    console.log(originalAssessmentName);

    const updateQuery = `
      UPDATE "Assessment"
      SET 
        "duration" = $1,
        "isExamProctored" = $2,
        "assignmentType" = $3,
        "title" = $4
      WHERE "id" = $5
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      duration,
      isExamProctored,
      assignmentType,
      title,
      id,
    ]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const updatedExam = result.rows[0];

    // Parse JSON fields for response
    try {
      updatedExam.questions = updatedExam.questions
        ? JSON.parse(updatedExam.questions)
        : [];
      updatedExam.questionConfig = updatedExam.questionConfig
        ? JSON.parse(updatedExam.questionConfig)
        : {};
    } catch {
      // If parsing fails, just return as is
    }

    const checkSubmissionQuery = `
      SELECT *
      FROM "Submission"
      WHERE "examId" = $1
    `;

    const checkSubmissionResult = await pool.query(checkSubmissionQuery, [originalAssessmentName]);

    console.log(checkSubmissionResult.rows);

    if (checkSubmissionResult.rows.length > 0) {
      return NextResponse.json({ error: "Cannot update exam as it has submissions" }, { status: 400 });
    }

    return NextResponse.json(updatedExam, { status: 200 });
  } catch (error) {
    logger.error("DB error updating assessment %s:", id, error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
