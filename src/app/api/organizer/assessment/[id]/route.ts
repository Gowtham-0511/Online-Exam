import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  console.log(id);

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
    console.error("DB error:", error);
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
  const { duration, isExamProctored, assignmentType } = body;

  // Validate input
  if (
    duration === undefined ||
    isExamProctored === undefined ||
    !assignmentType
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const updateQuery = `
      UPDATE "Assessment"
      SET 
        "duration" = $1,
        "isExamProctored" = $2,
        "assignmentType" = $3
      WHERE "id" = $4
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      duration,
      isExamProctored,
      assignmentType,
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

    return NextResponse.json(updatedExam, { status: 200 });
  } catch (error) {
    console.error("DB error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
