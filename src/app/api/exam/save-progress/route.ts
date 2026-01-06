import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function POST(req: Request) {
  const body = await req.json();
  const {
    examId,
    email,
    answers,
    mcqAnswers,
    activeQuestionIndex,
    timeLeft,
    flaggedQuestions,
    questionTimeSpent,
    codeRunCounts,
    lastSaved,
  } = body;

  if (!examId || !email) {
    return NextResponse.json(
      {
        error: "Missing required fields: examId, email",
      },
      {
        status: 400,
      }
    );
  }
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const query = `
      INSERT INTO "exam_progress" (
        "email",
        "examId",
        "answers",
        "mcqAnswers",
        "activeQuestionIndex",
        "timeLeft",
        "flaggedQuestions",
        "questionTimeSpent",
        "codeRunCounts",
        "lastSaved",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT ("email", "examId") 
      DO UPDATE SET
        "answers" = EXCLUDED."answers",
        "mcqAnswers" = EXCLUDED."mcqAnswers",
        "activeQuestionIndex" = EXCLUDED."activeQuestionIndex",
        "timeLeft" = EXCLUDED."timeLeft",
        "flaggedQuestions" = EXCLUDED."flaggedQuestions",
        "questionTimeSpent" = EXCLUDED."questionTimeSpent",
        "codeRunCounts" = EXCLUDED."codeRunCounts",
        "lastSaved" = EXCLUDED."lastSaved",
        "updatedAt" = NOW()
      RETURNING "id";
    `;

    const values = [
      email,
      examId,
      JSON.stringify(answers || []),
      JSON.stringify(mcqAnswers || {}),
      activeQuestionIndex || 0,
      timeLeft || 0,
      JSON.stringify(flaggedQuestions || []),
      JSON.stringify(questionTimeSpent || {}),
      JSON.stringify(codeRunCounts || {}),
      lastSaved || new Date().toISOString(),
    ];

    const result = await client.query(query, values);
    const progressId = result.rows[0]?.id;

    await client.query("COMMIT");

    logger.info(`Progress saved: ${progressId} for ${email}`);

    return NextResponse.json(
      {
        success: true,
        message: "Progress saved successfully",
        progressId,
        savedAt: new Date().toISOString(),
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    logger.error("Error saving progress:", error);
    await client.query("ROLLBACK");
    return NextResponse.json(
      {
        error: "Failed to save progress",
      },
      {
        status: 500,
      }
    );
  } finally {
    client.release();
  }
}
