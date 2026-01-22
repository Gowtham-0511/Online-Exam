import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  try {
    // Ensure table exists (quick fix for migration support)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS "AssessmentShares" (
            id serial4 PRIMARY KEY,
            "assessmentId" int4 NOT NULL,
            "sharedWithEmail" VARCHAR(255) NOT NULL,
            "sharedByEmail" VARCHAR(255) NOT NULL,
            "permission" VARCHAR(50) DEFAULT 'view',
            "createdAt" TIMESTAMP DEFAULT now(),
            CONSTRAINT unique_share UNIQUE ("assessmentId", "sharedWithEmail")
        );
    `);

    const query = `
        SELECT A.*, 
               CASE WHEN S."sharedWithEmail" IS NOT NULL THEN true ELSE false END as "isShared",
               S."permission"
        FROM "Assessment" A
        LEFT JOIN "AssessmentShares" S ON A.id = S."assessmentId" AND S."sharedWithEmail" = $1
        WHERE A."createdBy" = $1 
           OR S."sharedWithEmail" = $1
        ORDER BY A."createdAt" DESC
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
