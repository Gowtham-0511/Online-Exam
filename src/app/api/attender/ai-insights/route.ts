import pool from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  try {
    const cacheQuery = `
        SELECT "aiInsights", "insightsGeneratedAt"
        FROM "UserInsightsCache"
        WHERE email = $1
    `;

    const cacheResult = await pool.query(cacheQuery, [email as string]);

    if (cacheResult.rows.length > 0 && cacheResult.rows[0].aiInsights) {
      return NextResponse.json(
        {
          hasData: true,
          fromCache: true,
          ...cacheResult.rows[0].aiInsights,
          generatedAt: cacheResult.rows[0].insightsGeneratedAt,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        hasData: false,
        message:
          "No insights available yet. They will be generated after your first exam.",
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
