import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  try {
    const query = `
        SELECT *
        FROM "Assessment"
        WHERE "createdBy" = $1
        ORDER BY "createdAt" DESC
    `;

    const result = await pool.query(query, [email]);

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    logger.error("Error fetching assessment by user %s:", email, error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
