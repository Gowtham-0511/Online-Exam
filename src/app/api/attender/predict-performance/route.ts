import pool from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  try {
    const cacheQuery = `
        SELECT "performancePrediction", "predictionGeneratedAt", "totalExamsCount"
        FROM "UserInsightsCache"
        WHERE email = $1
    `;

    const cacheResult = await pool.query(cacheQuery, [email as string]);

    if (
      cacheResult.rows.length > 0 &&
      cacheResult.rows[0].performancePrediction
    ) {
      return NextResponse.json(
        {
          hasData: true,
          fromCache: true,
          ...cacheResult.rows[0].performancePrediction,
          generatedAt: cacheResult.rows[0].predictionGeneratedAt,
        },
        { status: 200 }
      );
    }

    const examCountQuery = `
        SELECT COUNT(*) as count
        FROM submissions
        WHERE email = $1 AND disqualified = false
    `;
    const countResult = await pool.query(examCountQuery, [email as string]);
    const examCount = parseInt(countResult.rows[0].count);

    if (examCount < 2) {
      return NextResponse.json(
        {
          hasData: false,
          message: "Need at least 2 exams for prediction",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        hasData: false,
        message:
          "Predictions will be generated after your next exam submission",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
