import pool from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { assessmentId, batchSchedules, userSchedules } = body;

  if (!assessmentId || !batchSchedules || !userSchedules) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: assessmentId, batchIds, userIds, startTime, endTime",
      },
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
                    "assessmentId", "userId", "startTime", "endTime"
                )
                VALUES ($1, $2, $3, $4)
            `;

      for (const schedule of userSchedules) {
        await pool.query(userInsertQuery, [
          assessmentId,
          schedule.userId,
          schedule.startTime
            ? new Date(schedule.startTime).toISOString()
            : null,
          schedule.endTime ? new Date(schedule.endTime).toISOString() : null,
        ]);
      }
    }
    return NextResponse.json({ status: 201 });
  } catch (error) {
    console.error("Error scheduling assessment:", error);
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
