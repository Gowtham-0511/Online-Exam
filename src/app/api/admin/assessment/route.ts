import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const query = `SELECT * FROM "Assessment"`;

    logger.info("Admin fetching all assessments");

    const result = await pool.query(query);

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error) {
    logger.error("Error fetching assessments in /api/admin/assessment:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
