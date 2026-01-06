import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

const examCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  // Await the params object
  const { examId } = await params;

  // console.log(typeof examId);

  const cached = examCache.get(examId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.debug("Serving exam details from cache: %s", examId);
    return NextResponse.json(cached.data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=180",
      },
    });
  }

  try {
    const client = await pool.connect();

    try {
      logger.info("Fetching exam details for: %s", examId);
      const query = `SELECT * FROM "Assessment" WHERE "title" = $1`;
      const result = await client.query(query, [examId]);

      if (result.rowCount === 0) {
        return NextResponse.json({ error: "Exam not found" }, { status: 404 });
      }

      const exam = result.rows[0];

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

      examCache.set(examId, { data: exam, timestamp: Date.now() });

      return NextResponse.json(exam, {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=180",
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
