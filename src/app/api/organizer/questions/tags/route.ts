import pool from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language");
  try {
    let query = `
        SELECT DISTINCT unnest(tags) as tag
        FROM "Questions"
        WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
    `;

    const params: any[] = [];
    if (language) {
      query += ` AND language = $1`;
      params.push(language);
    }

    query += ` ORDER BY tag`;

    const result = await pool.query(query, params);
    const tags = result.rows.map((row) => row.tag);

    return NextResponse.json(tags, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
