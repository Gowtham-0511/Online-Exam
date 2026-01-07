import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import pool from "@/lib/db/db";
import logger from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planId } = await params;

  const client = await pool.connect();

  try {
    // Get learning plan details
    const planResult = await client.query(
      `SELECT * FROM "LearningPlan" WHERE id = $1`,
      [planId]
    );

    if (planResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Learning plan not found" },
        { status: 404 }
      );
    }

    // Get user's progress
    const progressResult = await client.query(
      `SELECT * FROM "UserLearningPlan" 
             WHERE "planId" = $1 AND "userEmail" = $2`,
      [planId, session.user.email]
    );

    if (progressResult.rowCount === 0) {
      return NextResponse.json(
        { error: "You are not assigned to this learning plan" },
        { status: 403 }
      );
    }

    const plan = planResult.rows[0];
    const userProgress = progressResult.rows[0];

    // Parse JSON fields
    plan.weeks =
      typeof plan.weeks === "string" ? JSON.parse(plan.weeks) : plan.weeks;
    userProgress.progress =
      typeof userProgress.progress === "string"
        ? JSON.parse(userProgress.progress)
        : userProgress.progress;

    // Update last accessed time
    await client.query(
      `UPDATE "UserLearningPlan" 
             SET "lastAccessedAt" = NOW() 
             WHERE id = $1`,
      [userProgress.id]
    );

    return NextResponse.json({
      success: true,
      plan,
      userProgress,
    });
  } catch (error: any) {
    logger.error("Error fetching learning plan %s:", planId, error);
    return NextResponse.json(
      {
        error: "Failed to fetch learning plan",
        message: error.message,
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
