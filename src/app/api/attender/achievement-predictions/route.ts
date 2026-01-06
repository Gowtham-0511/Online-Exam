import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  try {
    const cacheQuery = `
        SELECT "achievementPredictions", "achievementsGeneratedAt"
        FROM "UserInsightsCache"
        WHERE email = $1
    `;

    const cacheResult = await pool.query(cacheQuery, [email as string]);

    if (
      cacheResult.rows.length > 0 &&
      cacheResult.rows[0].achievementPredictions
    ) {
      return NextResponse.json(
        {
          hasData: true,
          fromCache: true,
          ...cacheResult.rows[0].achievementPredictions,
          generatedAt: cacheResult.rows[0].achievementsGeneratedAt,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        hasData: false,
        message: "No achievements yet",
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error fetching achievement predictions for %s:", email, error);
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}
