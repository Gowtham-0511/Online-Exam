import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const examId = url.searchParams.get("examId");
  const email = url.searchParams.get("email");

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
    const query = `
      SELECT *
      FROM "exam_progress"
      WHERE "email" = $1 AND "examId" = $2
      ORDER BY "updatedAt" DESC
      LIMIT 1;
    `;

    const result = await client.query(query, [email, examId]);

    if (result.rowCount === 0) {
      return NextResponse.json({
        error: "No saved progress found",
      });
    }

    const progress = result.rows[0];

    const safeJSONParse = (data: any, fallback: any) => {
      try {
        if (!data) return fallback;
        return JSON.parse(data);
      } catch (e) {
        // Debug level log for bad json
        logger.debug("Failed to parse JSON for progress property: %s", e);
        return fallback;
      }
    };

    progress.answers = safeJSONParse(progress.answers, []);
    progress.mcqAnswers = safeJSONParse(progress.mcqAnswers, {});
    progress.flaggedQuestions = safeJSONParse(progress.flaggedQuestions, []);
    progress.questionTimeSpent = safeJSONParse(progress.questionTimeSpent, {});
    progress.codeRunCounts = safeJSONParse(progress.codeRunCounts, {});

    return NextResponse.json(
      {
        success: true,
        progress,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    logger.error("Error loading progress for user %s on exam %s: %o", email, examId, error);
    return NextResponse.json(
      {
        error: "Failed to load progress",
      },
      {
        status: 500,
      }
    );
  } finally {
    client.release();
  }
}
