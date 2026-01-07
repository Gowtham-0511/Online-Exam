import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
            ulp.id,
            ulp."planId",
            lp.name as "planName",
            lp.description as "planDescription",
            lp.language,
            lp.difficulty,
            lp.duration,
            ulp."currentWeek",
            ulp.status,
            ulp."overallProgress",
            ulp."startDate",
            ulp."assignedAt",
            ulp."lastAccessedAt"
        FROM "UserLearningPlan" ulp
        JOIN "LearningPlan" lp ON ulp."planId" = lp.id
        WHERE ulp."userEmail" = $1
        ORDER BY ulp."assignedAt" DESC`,
      [email]
    );

    return NextResponse.json(
      {
        success: true,
        plans: result.rows,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error fetching learning plans for %s:", email, error);
    return NextResponse.json(
      { error: "Failed to fetch learning plans" },
      { status: 500 }
    );
  }
}
