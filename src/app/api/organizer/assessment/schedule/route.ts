import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function POST(request: Request) {
  const body = await request.json();
  const { assessmentId, batchSchedules, userSchedules } = body;

  if (!assessmentId) {
    return NextResponse.json(
      {
        error: "Missing required fields: assessmentId",
      },
      { status: 400 }
    );
  }

  if (
    (!batchSchedules || batchSchedules.length === 0) &&
    (!userSchedules || userSchedules.length === 0)
  ) {
    return NextResponse.json(
      { error: "No schedules provided" },
      { status: 400 }
    );
  }

  try {
    if (batchSchedules && batchSchedules.length > 0) {
      await pool.query(
        `DELETE FROM "AssessmentBatchMapping" WHERE "assessmentId" = $1`,
        [assessmentId]
      );

      const batchInsertQuery = `
        INSERT INTO "AssessmentBatchMapping" (
            "assessmentId", "batchId", "startTime", "endTime"
        )
        VALUES ($1, $2, $3, $4)
      `;

      for (const schedule of batchSchedules) {
        await pool.query(batchInsertQuery, [
          assessmentId,
          schedule.batchId,
          schedule.startTime
            ? new Date(schedule.startTime).toISOString()
            : null,
          schedule.endTime ? new Date(schedule.endTime).toISOString() : null,
        ]);
      }
    }

    if (userSchedules && userSchedules.length > 0) {
      await pool.query(
        `DELETE FROM "AssessmentUserMapping" WHERE "assessmentId" = $1`,
        [assessmentId]
      );

      const userInsertQuery = `
        INSERT INTO "AssessmentUserMapping" (
            "assessmentId", "userEmail", startTime, endTime, "createdAt"
        )
        VALUES ($1, $2, $3, $4, $5)
      `;

      for (const schedule of userSchedules) {
        await pool.query(userInsertQuery, [
          assessmentId,
          schedule.userEmail,
          schedule.startTime
            ? new Date(schedule.startTime).toISOString()
            : null,
          schedule.endTime ? new Date(schedule.endTime).toISOString() : null,
          new Date().toISOString(),
        ]);
      }
    }
    return NextResponse.json({ status: 201 });
  } catch (error) {
    logger.error("Error scheduling assessment %s:", assessmentId, error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
