import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/verify-token";
import pool from "@/lib/db/db";
import logger from "@/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  let client;

  try {
    // 1. Authenticate user
    const session = await getUserFromRequest(request as any); // Cast to any or NextRequest
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await params;
    const { weekNumber, type, value } = await request.json();

    client = await pool.connect();

    // 2. Get progress + weeks
    const result = await client.query(
      `SELECT progress, weeks FROM "UserLearningPlan" ulp
       JOIN "LearningPlan" lp ON ulp."planId" = lp.id
       WHERE ulp."planId" = $1 AND ulp."userEmail" = $2`,
      [planId, session.user.email]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Learning plan not found" },
        { status: 404 }
      );
    }

    let currentProgress =
      typeof result.rows[0].progress === "string"
        ? JSON.parse(result.rows[0].progress)
        : result.rows[0].progress;

    const weeks =
      typeof result.rows[0].weeks === "string"
        ? JSON.parse(result.rows[0].weeks)
        : result.rows[0].weeks;

    // 3. Find or create week progress entry
    let weekProgress = currentProgress.find(
      (p: any) => p.weekId === weekNumber
    );

    if (!weekProgress) {
      weekProgress = {
        weekId: weekNumber,
        completedTopics: [],
        completedGoals: [],
        completedResources: [],
        completedAssessments: [],
        startedAt: new Date().toISOString(),
      };
      currentProgress.push(weekProgress);
    }

    // 4. Get the specific week
    const week = weeks.find((w: any) => w.weekNumber === weekNumber);
    if (!week) {
      return NextResponse.json(
        { error: "Invalid week number" },
        { status: 400 }
      );
    }

    // 5. Apply progress update logic
    switch (type) {
      case "topic":
        if (!weekProgress.completedTopics.includes(value)) {
          weekProgress.completedTopics.push(value);
        } else {
          weekProgress.completedTopics = weekProgress.completedTopics.filter(
            (t: string) => t !== value
          );
        }
        break;

      case "goal":
        if (!weekProgress.completedGoals.includes(value)) {
          weekProgress.completedGoals.push(value);
        } else {
          weekProgress.completedGoals = weekProgress.completedGoals.filter(
            (g: string) => g !== value
          );
        }
        break;

      case "resource":
        if (!weekProgress.completedResources.includes(value)) {
          weekProgress.completedResources.push(value);
        } else {
          weekProgress.completedResources =
            weekProgress.completedResources.filter((r: string) => r !== value);
        }
        break;

      case "assessment":
        const existing = weekProgress.completedAssessments.find(
          (a: any) => (typeof a === "string" ? a : a.title) === value
        );

        if (!existing) {
          weekProgress.completedAssessments.push({
            title: value,
            completedAt: new Date().toISOString(),
          });
        } else {
          weekProgress.completedAssessments =
            weekProgress.completedAssessments.filter(
              (a: any) => (typeof a === "string" ? a : a.title) !== value
            );
        }
        break;
    }

    // 6. Compute overall progress
    let totalItems = 0;
    let completedItems = 0;

    weeks.forEach((w: any) => {
      const wp = currentProgress.find(
        (p: any) => p.weekId === w.weekNumber
      ) || {
        completedTopics: [],
        completedGoals: [],
        completedResources: [],
        completedAssessments: [],
      };

      totalItems +=
        w.topics.length +
        w.goals.length +
        w.resources.length +
        w.assessments.length;

      completedItems +=
        wp.completedTopics.length +
        wp.completedGoals.length +
        wp.completedResources.length +
        wp.completedAssessments.length;
    });

    const overallProgress =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // 7. Determine current week
    let currentWeek = 1;

    for (let i = 0; i < weeks.length; i++) {
      const w = weeks[i];
      const wp = currentProgress.find((p: any) => p.weekId === w.weekNumber);

      if (!wp) {
        currentWeek = w.weekNumber;
        break;
      }

      const weekTotal =
        w.topics.length +
        w.goals.length +
        w.resources.length +
        w.assessments.length;

      const weekCompleted =
        (wp.completedTopics?.length || 0) +
        (wp.completedGoals?.length || 0) +
        (wp.completedResources?.length || 0) +
        (wp.completedAssessments?.length || 0);

      if (weekCompleted < weekTotal) {
        currentWeek = w.weekNumber;
        break;
      }

      if (i === weeks.length - 1) {
        currentWeek = w.weekNumber;
      }
    }

    // 8. Determine status
    let status = "in-progress";

    if (overallProgress === 100) status = "completed";
    else if (overallProgress === 0) status = "not-started";

    // 9. Update DB
    await client.query(
      `UPDATE "UserLearningPlan" 
        SET progress = $1,
            "overallProgress" = $2,
            "currentWeek" = $3,
            status = $4::varchar,
            "lastAccessedAt" = NOW(),
            "completedAt" = CASE WHEN $4::varchar = 'completed' THEN NOW() ELSE "completedAt" END
        WHERE "planId" = $5 AND "userEmail" = $6`,
      [
        JSON.stringify(currentProgress),
        overallProgress,
        currentWeek,
        status,
        planId,
        session.user.email,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        progress: currentProgress,
        overallProgress,
        currentWeek,
        status,
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error("Progress Update Error:", error);
    return NextResponse.json(
      {
        error: "Failed to update progress",
        message: error.message,
      },
      { status: 500 }
    );
  } finally {
    client?.release?.();
  }
}
